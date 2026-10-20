from fastapi import APIRouter, Depends
import pandas as pd
from pydantic import BaseModel, Field
from typing import Any

from api.dependencies import get_df, get_model
from api.users import validate_user
from services.user import get_latest_health
from services.what_if import simulate_what_if

router = APIRouter()

class WhatIfRequest(BaseModel):
    sleep_hours: float = Field(..., ge=0, le=24, description="Hypothetical sleep hours")
    hydration_liters: float = Field(..., ge=0, le=10, description="Hypothetical hydration in liters")
    stress: float = Field(..., ge=0, le=10, description="Hypothetical stress level 0-10")
    activity_steps: int = Field(..., ge=0, description="Hypothetical activity steps")
    caffeine: float = Field(..., ge=0, description="Hypothetical caffeine units")

@router.post("/{user_id}/what-if")
async def run_what_if_simulation(
    user_id: str,
    request: WhatIfRequest,
    df: pd.DataFrame = Depends(get_df),
    model: Any = Depends(get_model)
):
    """
    Run the what-if model simulation to estimate probability under hypothetical conditions.
    """
    user_df = validate_user(df, user_id)
    current_health = get_latest_health(user_df)
    
    result = simulate_what_if(
        model=model,
        current_health=current_health,
        sleep=request.sleep_hours,
        hydration=request.hydration_liters,
        stress=request.stress,
        activity=request.activity_steps,
        caffeine=request.caffeine
    )
    
    return {
        "user_id": user_id,
        "current_risk": round(float(result["current_risk"]), 3),
        "simulated_risk": round(float(result["simulated_risk"]), 3),
        "difference": round(float(result["difference"]), 3)
    }
