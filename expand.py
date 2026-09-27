
import numpy as np
import pandas as pd
from pathlib import Path

DATA = Path("data/health_data.csv")
BACKUP = Path("data/health_data_original.csv")
rng = np.random.default_rng(42)

df = pd.read_csv(DATA, parse_dates=["date"])
df = df.sort_values(["user_id", "date"]).reset_index(drop=True)

# Keep an untouched copy of your teammate's dataset.
if not BACKUP.exists():
    df.to_csv(BACKUP, index=False)

# Different simulated relationships for each user.
profiles = {}
for user in df["user_id"].unique():
    profiles[user] = {
        "sleep_sensitivity": rng.uniform(0.5, 1.8),
        "stress_sensitivity": rng.uniform(0.5, 1.8),
        "hydration_sensitivity": rng.uniform(0.5, 1.8),
        "resting_hr": rng.uniform(58, 78),
        "weight": rng.uniform(52, 85),
        "systolic_bp": rng.uniform(105, 128),
    }

records = []

for user, group in df.groupby("user_id", sort=False):
    p = profiles[user]
    group = group.sort_values("date")
    previous_sleep_deficit = 0

    for _, row in group.iterrows():
        sleep = row["sleep_hours"]
        hydration = row["hydration_liters"]
        stress = row["stress"]
        activity = row["activity_steps"]
        caffeine = row["caffeine"]

        sleep_deficit = max(0, 7.5 - sleep)
        hydration_deficit = max(0, 2.2 - hydration)
        activity_load = activity / 10000

        resting_hr = np.clip(
            p["resting_hr"] + stress * 0.65
            + sleep_deficit * 1.4
            + rng.normal(0, 2), 45, 110
        )
        heart_rate = resting_hr + 10 + activity_load * 12
        systolic = (
            p["systolic_bp"]
            + stress * p["stress_sensitivity"] * 1.4
            + caffeine * 1.5
            + rng.normal(0, 5)
        )
        diastolic = 65 + (systolic - 105) * 0.38 + rng.normal(0, 3)

        sleep_quality = np.clip(
            95 - sleep_deficit * 11
            - stress * 2 - caffeine * 2
            + rng.normal(0, 6), 0, 100
        )
        recovery = np.clip(
            100 - sleep_deficit * p["sleep_sensitivity"] * 12
            - stress * p["stress_sensitivity"] * 3
            - hydration_deficit * 10
            + rng.normal(0, 5), 0, 100
        )

        # These are synthetic research labels, NOT clinical diagnoses.
        fatigue = int(
            sleep_deficit * p["sleep_sensitivity"] * 2
            + stress * 0.4 + previous_sleep_deficit
            + rng.normal(0, 2) > 5
        )
        dehydration_risk = int(
            hydration_deficit * p["hydration_sensitivity"] * 3
            + activity_load + rng.normal(0, 0.6) > 2
        )
        poor_sleep = int(sleep_quality < 65)
        stress_overload = int(
            stress * p["stress_sensitivity"]
            + rng.normal(0, 1) > 7
        )
        recovery_deterioration = int(recovery < 60)
        bp_elevation = int(
            systolic > p["systolic_bp"] + 12
        )

        record = row.to_dict()
        record.update({
            "heart_rate": round(heart_rate, 1),
            "resting_hr": round(resting_hr, 1),
            "systolic_bp": round(systolic, 1),
            "diastolic_bp": round(diastolic, 1),
            "weight_kg": round(
                p["weight"] + rng.normal(0, 0.3), 1
            ),
            "temperature_c": round(
                36.6 + rng.normal(0, 0.2), 2
            ),
            "calories": round(
                1600 + activity * 0.045
                + rng.normal(0, 150)
            ),
            "sleep_quality": round(sleep_quality, 1),
            "recovery": round(recovery, 1),
            "fatigue": fatigue,
            "dehydration_risk": dehydration_risk,
            "poor_sleep": poor_sleep,
            "stress_overload": stress_overload,
            "recovery_deterioration": recovery_deterioration,
            "bp_elevation": bp_elevation,
        })
        records.append(record)
        previous_sleep_deficit = sleep_deficit

expanded = pd.DataFrame(records)
expanded.to_csv(DATA, index=False)

print("Dataset expanded successfully!")
print("Records:", len(expanded))
print("Users:", expanded["user_id"].nunique())
print("Columns:", len(expanded.columns))
print("Saved to:", DATA)
print("Original backup:", BACKUP)