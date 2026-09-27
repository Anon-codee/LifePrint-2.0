
import os
import pandas as pd

REQUIRED_COLUMNS = [
    "user_id", "date",
    "sleep_hours", "hydration_liters", "stress",
    "activity_steps", "caffeine", "headache",
    "heart_rate", "resting_hr",
    "systolic_bp", "diastolic_bp",
    "weight_kg", "temperature_c", "calories",
    "sleep_quality", "recovery",
    "bp_elevation", "fatigue", "dehydration_risk",
    "poor_sleep", "stress_overload",
    "recovery_deterioration"
]

def load_health_data(file_path="data/health_data.csv"):
    if not os.path.exists(file_path):
        raise FileNotFoundError(
            f"Health data file not found: {file_path}"
        )

    df = pd.read_csv(file_path, parse_dates=["date"])

    missing = [
        col for col in REQUIRED_COLUMNS
        if col not in df.columns
    ]

    if missing:
        raise ValueError(
            f"Missing required columns: {missing}"
        )

    if df[REQUIRED_COLUMNS].isna().any().any():
        raise ValueError("Dataset contains missing required values")

    if df.duplicated(["user_id", "date"]).any():
        raise ValueError("Duplicate user-date records found")

    return df.sort_values(
        ["user_id", "date"]
    ).reset_index(drop=True)