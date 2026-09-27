
import pandas as pd

SIGNALS = [
    "sleep_hours",
    "hydration_liters",
    "stress",
    "activity_steps",
    "caffeine",
    "heart_rate",
    "resting_hr",
    "systolic_bp",
    "diastolic_bp",
    "sleep_quality",
    "recovery",
]

OUTCOMES = [
    "headache",
    "bp_elevation",
    "fatigue",
    "dehydration_risk",
    "poor_sleep",
    "stress_overload",
    "recovery_deterioration",
]

# Avoid reporting relationships that merely restate
# how some of our synthetic labels were generated.
EXCLUDED_PAIRS = {
    ("systolic_bp", "bp_elevation"),
    ("sleep_quality", "poor_sleep"),
    ("stress", "stress_overload"),
    ("recovery", "recovery_deterioration"),
    ("hydration_liters", "dehydration_risk"),
}


def discover_patterns(df, user_id, min_observations=8):
    user = df[df["user_id"] == user_id].copy()

    if user.empty:
        raise ValueError(f"User {user_id} not found")

    user["date"] = pd.to_datetime(user["date"])
    user = user.sort_values("date").reset_index(drop=True)

    # Each day's baseline uses only preceding readings.
    for signal in SIGNALS:
        user[f"{signal}_baseline"] = (
            user[signal]
            .shift(1)
            .rolling(30, min_periods=14)
            .mean()
        )

    # Look at outcomes on the FOLLOWING calendar day.
    next_day = user[["date"] + OUTCOMES].copy()
    next_day["date"] -= pd.Timedelta(days=1)

    next_day = next_day.rename(
        columns={outcome: f"next_{outcome}" for outcome in OUTCOMES}
    )

    user = user.merge(next_day, on="date", how="left")

    patterns = []

    for signal in SIGNALS:
        baseline_col = f"{signal}_baseline"

        valid = user.dropna(
            subset=[signal, baseline_col]
        ).copy()

        # Compare readings with personal baseline.
        # Require at least a 10% deviation.
        threshold = valid[baseline_col].abs() * 0.10

        for direction in ["below", "above"]:
            if direction == "below":
                exposed = (
                    valid[signal]
                    < valid[baseline_col] - threshold
                )
            else:
                exposed = (
                    valid[signal]
                    > valid[baseline_col] + threshold
                )

            for outcome in OUTCOMES:
                if (signal, outcome) in EXCLUDED_PAIRS:
                    continue

                next_col = f"next_{outcome}"

                eligible = valid[next_col].notna()
                affected = valid.loc[eligible & exposed]
                comparison = valid.loc[eligible & ~exposed]

                if (
                    len(affected) < min_observations
                    or len(comparison) < min_observations
                ):
                    continue

                exposed_rate = float(
                    affected[next_col].mean()
                )
                comparison_rate = float(
                    comparison[next_col].mean()
                )

                difference = (
                    exposed_rate - comparison_rate
                ) * 100

                # Ignore very small observed differences.
                if abs(difference) < 10:
                    continue

                patterns.append({
                    "signal": signal,
                    "direction": direction,
                    "outcome": outcome,
                    "exposed_days": int(len(affected)),
                    "comparison_days": int(len(comparison)),
                    "exposed_event_count": int(
                        affected[next_col].sum()
                    ),
                    "comparison_event_count": int(
                        comparison[next_col].sum()
                    ),
                    "event_rate_exposed": round(
                        exposed_rate * 100, 1
                    ),
                    "event_rate_comparison": round(
                        comparison_rate * 100, 1
                    ),
                    "difference_percentage_points": round(
                        difference, 1
                    ),
                    "baseline_deviation_threshold": "10%",
                    "lag_days": 1,
                })

    patterns.sort(
        key=lambda p: abs(
            p["difference_percentage_points"]
        ),
        reverse=True,
    )

    return {
        "user_id": user_id,
        "days_available": len(user),
        "patterns_found": len(patterns),
        "patterns": patterns,
    }