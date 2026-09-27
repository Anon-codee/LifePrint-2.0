from fastapi import APIRouter, Depends, HTTPException
import pandas as pd
from typing import Any

from api.dependencies import get_df, get_model
from api.users import validate_user
from services.user import get_latest_health
from services.prediction import predict_headache, explain_prediction

router = APIRouter()

@router.get("/{user_id}/prediction")
async def get_prediction(
    user_id: str, 
    df: pd.DataFrame = Depends(get_df),
    model: Any = Depends(get_model)
):
    """
    Get the model-estimated likelihood of a headache for the user's latest health state.
    """
    user_df = validate_user(df, user_id)
    today = get_latest_health(user_df)
    
    probability = predict_headache(model, today)
    
    if probability >= 0.7:
        risk_band = "elevated"
    elif probability >= 0.4:
        risk_band = "moderate"
    else:
        risk_band = "low"
        
    return {
        "user_id": user_id,
        "target": "headache",
        "probability": round(float(probability), 3),
        "risk_band": risk_band
    }

@router.get("/{user_id}/prediction/explanation")
async def get_prediction_explanation(
    user_id: str,
    df: pd.DataFrame = Depends(get_df),
    model: Any = Depends(get_model)
):
    """
    Expose model feature importance for the user's latest prediction.
    """
    user_df = validate_user(df, user_id)
    today = get_latest_health(user_df)
    
    probability = predict_headache(model, today)
    explanations = explain_prediction(model, today)
    
    # Strip out non-essential info if desired, or return directly
    factors = []
    for expl in explanations:
        factors.append({
            "feature": expl["feature"],
            "importance": expl["importance"]
        })
        
    return {
        "user_id": user_id,
        "prediction": {
            "target": "headache",
            "probability": round(float(probability), 3)
        },
        "factors": factors
    }
