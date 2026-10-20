"""
Persistent User Profile Store for LifePrint 3.0.

NOTE: This JSON file store is designed solely for local research prototype persistence.
In a production deployment, this would be replaced by an ACID-compliant transactional database.

Stores user-specific twin configurations, active condition selections, and optional
user-configured reference ranges in `data/user_profiles.json`, kept completely separate
from the synthetic health observation dataset.
"""

from datetime import datetime, timezone
import json
import os
from pathlib import Path
import tempfile
import threading
from typing import Any, Dict, List, Optional

from services.conditions import DEFAULT_CONDITION_ID, is_valid_condition, get_condition

PROFILES_FILE = Path("data/user_profiles.json")
_LOCK = threading.Lock()


def _get_utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_default_profile(user_id: str, condition_id: str = DEFAULT_CONDITION_ID) -> Dict[str, Any]:
    cond = get_condition(condition_id)
    default_ranges = cond.get("default_reference_ranges", {}) if cond else {}
    now = _get_utc_now_iso()

    return {
        "user_id": user_id,
        "active_condition_id": condition_id,
        "custom_reference_ranges": default_ranges,
        "notes": "Initialized for local research twin prototype.",
        "created_at": now,
        "updated_at": now,
    }


def _read_all_profiles_unlocked() -> Dict[str, Dict[str, Any]]:
    """Read all profiles from disk. If the file is missing or corrupted, return an empty dict."""
    if not PROFILES_FILE.exists():
        return {}

    try:
        content = PROFILES_FILE.read_text(encoding="utf-8").strip()
        if not content:
            return {}
        data = json.loads(content)
        if isinstance(data, dict):
            return data
        return {}
    except (json.JSONDecodeError, OSError):
        # Corrupted or unreadable JSON file: fall back gracefully
        return {}


def _write_all_profiles_unlocked(profiles: Dict[str, Dict[str, Any]]) -> None:
    """Safely write profiles to disk using an atomic replace operation."""
    PROFILES_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Write to a temporary file in the same directory to allow atomic replace across filesystems
    temp_dir = PROFILES_FILE.parent
    with tempfile.NamedTemporaryFile("w", dir=temp_dir, delete=False, encoding="utf-8") as temp_file:
        json.dump(profiles, temp_file, indent=2)
        temp_file.flush()
        os.fsync(temp_file.fileno())
        temp_path = Path(temp_file.name)

    # Atomic replace
    temp_path.replace(PROFILES_FILE)


def get_user_profile(
    user_id: str,
    valid_user_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Retrieve user profile, initializing a default profile if not present.
    Raises ValueError if valid_user_ids is provided and user_id is not in it.
    """
    if valid_user_ids is not None and user_id not in valid_user_ids:
        raise ValueError(f"User '{user_id}' does not exist in dataset.")

    with _LOCK:
        profiles = _read_all_profiles_unlocked()
        if user_id not in profiles:
            default_profile = _build_default_profile(user_id)
            profiles[user_id] = default_profile
            _write_all_profiles_unlocked(profiles)
            return default_profile

        return profiles[user_id]


def update_user_profile(
    user_id: str,
    updates: Dict[str, Any],
    valid_user_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Update user profile with validation.
    Supported updates:
      - active_condition_id: str (must exist in CONDITIONS)
      - custom_reference_ranges: dict of {signal: {min, max, label?, unit?}}
      - notes: str
    """
    if valid_user_ids is not None and user_id not in valid_user_ids:
        raise ValueError(f"User '{user_id}' does not exist in dataset.")

    # Validate active_condition_id if provided
    new_condition_id = updates.get("active_condition_id")
    if new_condition_id is not None:
        if not isinstance(new_condition_id, str) or not is_valid_condition(new_condition_id):
            raise ValueError(f"Invalid condition ID '{new_condition_id}'.")

    # Validate custom_reference_ranges if provided
    ranges = updates.get("custom_reference_ranges")
    if ranges is not None:
        if not isinstance(ranges, dict):
            raise ValueError("custom_reference_ranges must be a dictionary.")
        for signal, range_cfg in ranges.items():
            if not isinstance(range_cfg, dict):
                raise ValueError(f"Range config for '{signal}' must be a dictionary.")
            if "min" in range_cfg and "max" in range_cfg:
                try:
                    c_min = float(range_cfg["min"])
                    c_max = float(range_cfg["max"])
                    if c_min > c_max:
                        raise ValueError(f"Range min ({c_min}) cannot be greater than max ({c_max}) for '{signal}'.")
                except (TypeError, ValueError) as err:
                    raise ValueError(f"Invalid numeric min/max in range config for '{signal}': {err}")

    with _LOCK:
        profiles = _read_all_profiles_unlocked()
        profile = profiles.get(user_id, _build_default_profile(user_id))

        if new_condition_id is not None:
            profile["active_condition_id"] = new_condition_id
        if ranges is not None:
            profile["custom_reference_ranges"] = ranges
        if "notes" in updates:
            profile["notes"] = str(updates["notes"])

        profile["updated_at"] = _get_utc_now_iso()
        profiles[user_id] = profile
        _write_all_profiles_unlocked(profiles)

        return profile
