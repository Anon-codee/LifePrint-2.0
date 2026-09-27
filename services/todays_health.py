
import pandas as pd

from services.baseline import calculate_baselines
from services.patterns import discover_patterns
from services.prediction import (
    HEALTH_FEATURES,
    train_models,
    predict_all,
    explain_all,
)

# These thresholds are dashboard heuristics,
# not medical thresholds or diagnoses.
WATCH_SIGNALS = {
    "sleep_hours": ("below", 10),
    "hydration_liters": ("below", 10),
    "stress": ("above", 15),
    "recovery": ("below", 10),
    "resting_hr": ("above", 10),
}


def get_todays_health(df, user_id):
    user = df[df["user_id"] == user_id].copy()

    if user.empty:
        raise ValueError(f"User {user_id} not found")

    user["date"] = pd.to_datetime(user["date"])
    user = user.sort_values("date")

    if len(user) < 45:
        raise ValueError(
            "At least 45 days of history are required"
        )

    # Reserve the latest day for the dashboard.
    # Train only on earlier observations.
    history = user.iloc[:-1].copy()
    latest = user.iloc[-1]

    baseline = calculate_baselines(user, user_id)

    # Train a separate seven-outcome engine
    # using this user's historical records.
    models = train_models(history)

    current_inputs = {
        feature: float(latest[feature])
        for feature in HEALTH_FEATURES
    }

    predictions = predict_all(
        models,
        current_inputs
    )

    explanations = explain_all(
        models,
        current_inputs
    )

    # Discover patterns from historical records only.
    discovery = discover_patterns(
        history,
        user_id
    )

    notable_deviations = []

    for signal, (direction, threshold) in WATCH_SIGNALS.items():
        info = baseline["signals"][signal]
        deviation = info["deviation_percent"]

        if deviation is None:
            continue

        triggered = (
            deviation <= -threshold
            if direction == "below"
            else deviation >= threshold
        )

        if triggered:
            notable_deviations.append({
                "signal": signal,
                "current": info["current"],
                "baseline": info["baseline"],
                "deviation_percent": deviation,
                "trend": info["trend"],
            })

    # Prototype dashboard state based on the
    # number of notable personal deviations.
    count = len(notable_deviations)

    if count >= 3:
        overall_state = "attention"
    elif count >= 1:
        overall_state = "monitor"
    else:
        overall_state = "stable"

    return {
        "user_id": user_id,
        "date": latest["date"].strftime("%Y-%m-%d"),
        "overall_health_state": overall_state,
        "state_basis": "experimental_baseline_deviation_heuristic",
        "notable_deviation_count": count,
        "notable_deviations": notable_deviations,
        "baseline": baseline["signals"],
        "predicted_states": predictions,
        "prediction_explanations": explanations,
        "top_patterns": discovery["patterns"][:5],
        "disclaimer": (
            "Synthetic-data research prototype. "
            "Predictions and dashboard states are "
            "not clinically validated."
        ),
    }