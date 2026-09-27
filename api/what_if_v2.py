
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
import pandas as pd

from api.dependencies import get_df
from services.what_if_v2 import simulate_what_if_v2


router = APIRouter()


class WhatIfV2Request(BaseModel):
    sleep_hours: float = Field(..., ge=0, le=24)
    hydration_liters: float = Field(..., ge=0, le=10)
    stress: float = Field(..., ge=0, le=10)
    activity_steps: int = Field(..., ge=0, le=100000)
    caffeine: float = Field(..., ge=0, le=20)


@router.post("/{user_id}/what-if-v2")
def run_what_if_v2(
    user_id: str,
    request: WhatIfV2Request,
    df: pd.DataFrame = Depends(get_df),
):
    try:
        return simulate_what_if_v2(
            df=df,
            user_id=user_id,
            changes=request.model_dump(),
        )
    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        )