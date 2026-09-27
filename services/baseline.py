
import pandas as pd
import numpy as np

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
    "weight_kg",
    "temperature_c",
    "calories",
    "sleep_quality",
    "recovery",
]


def calculate_baselines(df, user_id):
    user = df[df["user_id"] == user_id].copy()

    if user.empty:
        raise ValueError(f"User {user_id} not found")

    user["date"] = pd.to_datetime(user["date"])
    user = user.sort_values("date")

    latest = user.iloc[-1]
    today = latest["date"]

    # Exclude today's readings to avoid data leakage.
    history = user[
        (user["date"] < today)
        & (user["date"] >= today - pd.Timedelta(days=30))
    ]

    if len(history) < 7:
        raise ValueError(
            "At least 7 previous days of data are required"
        )

    results = {}

    for signal in SIGNALS:
        current = float(latest[signal])
        values = history[signal].astype(float)

        baseline = float(values.mean())
        volatility = float(values.std(ddof=0))

        deviation = (
            ((current - baseline) / abs(baseline)) * 100
            if baseline != 0 else None
        )

        # Compare the latest seven readings with the
        # preceding seven readings, when available.
        recent = values.tail(7)

        if len(values) >= 14:
            previous = values.iloc[-14:-7]
            trend_change = float(
                recent.mean() - previous.mean()
            )
        else:
            trend_change = float(
                recent.iloc[-1] - recent.iloc[0]
            )

        # Treat changes smaller than 10% of historical
        # standard deviation as approximately stable.
        threshold = max(volatility * 0.1, 0.001)

        if trend_change > threshold:
            trend = "increasing"
        elif trend_change < -threshold:
            trend = "decreasing"
        else:
            trend = "stable"

        results[signal] = {
            "current": round(current, 2),
            "baseline": round(baseline, 2),
            "deviation_percent": (
                round(deviation, 2)
                if deviation is not None else None
            ),
            "trend": trend,
            "trend_change": round(trend_change, 2),
            "volatility": round(volatility, 2),
            "history_days": len(history),
        }

    return {
        "user_id": user_id,
        "date": today.strftime("%Y-%m-%d"),
        "baseline_window_days": 30,
        "signals": results,
    }