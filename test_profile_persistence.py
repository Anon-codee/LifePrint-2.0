"""
Unit test for LifePrint 3.0 profile persistence store.
"""

import json
from pathlib import Path
import shutil

from services.profile_store import (
    PROFILES_FILE,
    get_user_profile,
    update_user_profile,
    _read_all_profiles_unlocked,
    _write_all_profiles_unlocked,
)

def run_tests():
    print("Testing Profile Store Persistence...")
    backup_file = Path("data/user_profiles_backup_test.json")

    # Backup if exists
    if PROFILES_FILE.exists():
        shutil.copy(PROFILES_FILE, backup_file)

    try:
        # Test 1: Fallback initialization for new user
        valid_users = ["U001", "U002"]
        profile = get_user_profile("U001", valid_user_ids=valid_users)
        assert profile["user_id"] == "U001"
        assert profile["active_condition_id"] == "cardiovascular_bp"
        assert "custom_reference_ranges" in profile
        assert "systolic_bp" in profile["custom_reference_ranges"]

        # Test 2: Invalid user raises ValueError
        try:
            get_user_profile("NONEXISTENT", valid_user_ids=valid_users)
            assert False, "Should have raised ValueError for invalid user"
        except ValueError:
            pass

        # Test 3: Updating profile
        updated = update_user_profile(
            "U001",
            {
                "active_condition_id": "cardiovascular_bp",
                "notes": "Testing notes persistence",
                "custom_reference_ranges": {
                    "systolic_bp": {"min": 100.0, "max": 135.0, "label": "Custom label"}
                }
            },
            valid_user_ids=valid_users,
        )
        assert updated["notes"] == "Testing notes persistence"
        assert updated["custom_reference_ranges"]["systolic_bp"]["min"] == 100.0

        # Test 4: Invalid range min > max raises ValueError
        try:
            update_user_profile(
                "U001",
                {"custom_reference_ranges": {"systolic_bp": {"min": 150.0, "max": 100.0}}},
                valid_user_ids=valid_users,
            )
            assert False, "Should have raised ValueError for min > max"
        except ValueError:
            pass

        # Test 5: Invalid condition ID raises ValueError
        try:
            update_user_profile(
                "U001",
                {"active_condition_id": "fake_condition"},
                valid_user_ids=valid_users,
            )
            assert False, "Should have raised ValueError for fake_condition"
        except ValueError:
            pass

        # Test 6: Safe recovery from malformed JSON
        PROFILES_FILE.write_text("{ malformed json ...", encoding="utf-8")
        recovered = _read_all_profiles_unlocked()
        assert recovered == {}
        # Fetching profile still works cleanly by regenerating
        clean_profile = get_user_profile("U002", valid_user_ids=valid_users)
        assert clean_profile["user_id"] == "U002"

        print("Profile Store Persistence tests passed successfully!")

    finally:
        # Restore backup if it existed
        if backup_file.exists():
            shutil.copy(backup_file, PROFILES_FILE)
            backup_file.unlink()

if __name__ == "__main__":
    run_tests()
