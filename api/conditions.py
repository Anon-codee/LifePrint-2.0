"""
FastAPI Router for LifePrint 3.0 Condition Domain & Digital Twin Status.

Provides endpoints for:
- GET /api/conditions
- GET /api/users/{user_id}/condition
- POST /api/users/{user_id}/condition
- GET /api/users/{user_id}/twin-status
"""

from fastapi import APIRouter, Depends, HTTPException, status
import pandas as pd
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional

from api.dependencies import get_df
from api.users import validate_user
from services.conditions import get_all_conditions, get_condition, is_valid_condition
from services.profile_store import get_user_profile, update_user_profile
from services.twin_status import build_twin_status

router = APIRouter()


class RangeConfig(BaseModel):
    min: float = Field(..., description="Minimum reference threshold")
    max: float = Field(..., description="Maximum reference threshold")
    unit: Optional[str] = Field(None, description="Measurement unit")
    label: Optional[str] = Field(None, description="User descriptive label")


class UpdateConditionRequest(BaseModel):
    condition_id: Optional[str] = Field(None, description="Condition ID to select")
    custom_reference_ranges: Optional[Dict[str, RangeConfig]] = Field(
        None, description="Optional user-configured reference markers (NOT medical targets)"
    )
    notes: Optional[str] = Field(None, description="User notes or preferences")


@router.get("/conditions", tags=["conditions"])
def list_conditions():
    """List all available condition profiles."""
    return {
        "conditions": get_all_conditions(),
        "disclaimer": (
            "Synthetic health digital twin research prototype. "
            "Conditions provide exploratory analytical focus and are not clinical diagnostics."
        ),
    }


@router.get("/users/{user_id}/condition", tags=["conditions"])
def get_user_condition_profile(user_id: str, df: pd.DataFrame = Depends(get_df)):
    """Retrieve the user's active condition profile and reference configuration."""
    validate_user(df, user_id)
    valid_users = df["user_id"].unique().tolist()

    try:
        profile = get_user_profile(user_id, valid_user_ids=valid_users)
        condition_id = profile.get("active_condition_id")
        cond_meta = get_condition(condition_id)

        return {
            "user_id": user_id,
            "active_condition_id": condition_id,
            "condition": cond_meta,
            "custom_reference_ranges": profile.get("custom_reference_ranges", {}),
            "notes": profile.get("notes", ""),
            "updated_at": profile.get("updated_at"),
            "disclaimer": (
                "Reference ranges are self-selected user markers, not clinical guidelines. "
                "All associated records are synthetic."
            ),
        }
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(err))


@router.post("/users/{user_id}/condition", tags=["conditions"])
def set_user_condition_profile(
    user_id: str,
    payload: UpdateConditionRequest,
    df: pd.DataFrame = Depends(get_df),
):
    """Update the user's active condition selection or reference ranges."""
    validate_user(df, user_id)
    valid_users = df["user_id"].unique().tolist()

    updates: Dict[str, Any] = {}
    if payload.condition_id is not None:
        if not is_valid_condition(payload.condition_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Condition '{payload.condition_id}' is not recognized.",
            )
        updates["active_condition_id"] = payload.condition_id

    if payload.custom_reference_ranges is not None:
        updates["custom_reference_ranges"] = {
            k: v.model_dump() for k, v in payload.custom_reference_ranges.items()
        }

    if payload.notes is not None:
        updates["notes"] = payload.notes

    try:
        updated_profile = update_user_profile(user_id, updates, valid_user_ids=valid_users)
        cond_meta = get_condition(updated_profile.get("active_condition_id"))

        return {
            "status": "success",
            "user_id": user_id,
            "profile": updated_profile,
            "condition": cond_meta,
            "message": "User condition preferences updated successfully.",
        }
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))


@router.get("/users/{user_id}/twin-status", tags=["twin-status"])
def get_user_twin_status(user_id: str, df: pd.DataFrame = Depends(get_df)):
    """Retrieve condition-focused digital twin status and telemetry."""
    validate_user(df, user_id)

    try:
        return build_twin_status(df, user_id)
    except ValueError as err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(err))
