from fastapi import APIRouter, Depends, HTTPException
import pandas as pd
from typing import Any

from api.dependencies import get_df
from services.user import get_user_data, get_latest_health, get_user_health_summary
from services.analytics import calculate_baseline, calculate_population_baseline, compare_to_baseline, discover_headache_relationships

router = APIRouter()

def validate_user(df: pd.DataFrame, user_id: str):
    """Helper to check if user exists, otherwise raise 404"""
    try:
        return get_user_data(df, user_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("")
async def list_users(df: pd.DataFrame = Depends(get_df)):
    """Return available synthetic users."""
    user_ids = df["user_id"].unique().tolist()
    return {
        "users": [{"user_id": uid} for uid in user_ids]
    }

@router.get("/{user_id}")
async def get_user_profile(user_id: str, df: pd.DataFrame = Depends(get_df)):
    """Return a concise summary of the selected user."""
    user_df = validate_user(df, user_id)
    total_days = len(user_df)
    headache_days = int(user_df["headache"].sum())
    
    return {
        "user_id": user_id,
        "total_days": total_days,
        "headache_days": headache_days
    }

@router.get("/{user_id}/today")
async def get_today_health(user_id: str, df: pd.DataFrame = Depends(get_df)):
    """Return the latest health state, baselines, and deviations for the user."""
    validate_user(df, user_id) # ensure user exists
    summary = get_user_health_summary(df, user_id)
    return {
        "user_id": user_id,
        "date": summary["today"]["date"],
        "current": summary["today"],
        "personal_baseline": summary["personal_baseline"],
        "population_baseline": summary["population_baseline"],
        "deviations": summary["deviations"]
    }

@router.get("/{user_id}/baseline")
async def get_baseline(user_id: str, df: pd.DataFrame = Depends(get_df)):
    """Return baseline comparisons for the user against population."""
    user_df = validate_user(df, user_id)
    personal = calculate_baseline(user_df)
    population = calculate_population_baseline(df)
    comparison = compare_to_baseline(personal, population)
    
    return {
        "user_id": user_id,
        "personal": personal,
        "population": population,
        "comparison": comparison
    }

@router.get("/{user_id}/patterns")
async def get_patterns(user_id: str, df: pd.DataFrame = Depends(get_df)):
    """Return discovered relationships for this user."""
    user_df = validate_user(df, user_id)
    relationships = discover_headache_relationships(user_df)
    
    primary_pattern = relationships[0] if relationships else None
    
    total_days = len(user_df)
    headache_days = int(user_df["headache"].sum())
    
    return {
        "user_id": user_id,
        "primary_pattern": primary_pattern,
        "relationships": relationships,
        "evidence": {
            "total_days": total_days,
            "headache_days": headache_days
        }
    }

@router.get("/{user_id}/timeline")
async def get_timeline(user_id: str, df: pd.DataFrame = Depends(get_df)):
    """Return longitudinal health data for the user."""
    user_df = validate_user(df, user_id)
    # Convert dates to string for JSON serialization
    records = user_df.sort_values(by="date", ascending=True).to_dict(orient="records")
    return {
        "user_id": user_id,
        "timeline": records
    }

