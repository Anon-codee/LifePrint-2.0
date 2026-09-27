import pandas as pd
from services.analytics import (
    calculate_baseline,
    calculate_population_baseline,
    compare_to_baseline,
    discover_headache_relationships
)

def get_user_data(df, user_id):
    """
    Extract data specific to a single user.
    """
    user_df = df[df["user_id"] == user_id].copy()
    if user_df.empty:
        raise ValueError(f"User {user_id} not found in dataset.")
    return user_df

def get_latest_health(user_df):
    """
    Get the most recent health record for the user.
    """
    latest = user_df.sort_values("date").iloc[-1]
    return {
        "date": str(latest["date"]),
        "sleep_hours": float(latest["sleep_hours"]),
        "hydration_liters": float(latest["hydration_liters"]),
        "stress": float(latest["stress"]),
        "activity_steps": float(latest["activity_steps"]),
        "caffeine": float(latest["caffeine"]),
        "headache": int(latest["headache"])
    }

def get_user_health_summary(df, user_id):
    """
    Construct a JSON-serializable user summary object containing
    latest health, baselines, deviations, patterns, and evidence.
    """
    user_df = get_user_data(df, user_id)
    
    today = get_latest_health(user_df)
    personal_baseline = calculate_baseline(user_df)
    population_baseline = calculate_population_baseline(df)
    deviations = compare_to_baseline(today, personal_baseline)
    patterns = discover_headache_relationships(user_df)
    
    total_days = len(user_df)
    headache_days = int(user_df["headache"].sum())
    
    return {
        "user_id": user_id,
        "today": today,
        "personal_baseline": personal_baseline,
        "population_baseline": population_baseline,
        "deviations": deviations,
        "patterns": patterns,
        "evidence": {
            "total_days": total_days,
            "headache_days": headache_days,
            "non_headache_days": total_days - headache_days
        }
    }
