
import pandas as pd

from services.prediction import (
    HEALTH_FEATURES,
    train_models,
    predict_all,
)


ADJUSTABLE_FEATURES = [
    "sleep_hours",
    "hydration_liters",
    "stress",
    "activity_steps",
    "caffeine",
]


def simulate_what_if_v2(df, user_id, changes):
    user = df[df["user_id"] == user_id].copy()

    if user.empty:
        raise ValueError(f"User {user_id} not found")

    user["date"] = pd.to_datetime(user["date"])
    user = user.sort_values("date")

    if len(user) < 45:
        raise ValueError(
            "At least 45 days of history are required"
        )

    # Train without the latest record.
    history = user.iloc[:-1].copy()
    latest = user.iloc[-1]

    models = train_models(history)

    # Current recorded measurements
    current = {
        feature: float(latest[feature])
        for feature in HEALTH_FEATURES
    }

    # Copy current values before modifying inputs.
    simulated = current.copy()

    for feature in ADJUSTABLE_FEATURES:
        if feature in changes:
            simulated[feature] = float(
                changes[feature]
            )

    # Predictions are percentages (0–100).
    current_predictions = predict_all(
        models,
        current,
    )

    simulated_predictions = predict_all(
        models,
        simulated,
    )

    outcomes = {}

    for outcome, current_value in (
        current_predictions.items()
    ):
        simulated_value = (
            simulated_predictions[outcome]
        )

        outcomes[outcome] = {
            "current": round(
                float(current_value), 2
            ),
            "simulated": round(
                float(simulated_value), 2
            ),
            "difference_percentage_points": round(
                float(
                    simulated_value - current_value
                ),
                2,
            ),
        }

    changed_inputs = {}

    for feature in ADJUSTABLE_FEATURES:
        original = current[feature]
        hypothetical = simulated[feature]

        if abs(hypothetical - original) > 0.0001:
            changed_inputs[feature] = {
                "current": round(original, 2),
                "simulated": round(
                    hypothetical, 2
                ),
                "difference": round(
                    hypothetical - original,
                    2,
                ),
            }

    return {
        "user_id": user_id,
        "date": latest["date"].strftime(
            "%Y-%m-%d"
        ),
        "current_inputs": {
            feature: current[feature]
            for feature in ADJUSTABLE_FEATURES
        },
        "simulated_inputs": {
            feature: simulated[feature]
            for feature in ADJUSTABLE_FEATURES
        },
        "changed_inputs": changed_inputs,
        "outcomes": outcomes,
        "disclaimer": (
            "Experimental model estimates trained "
            "on synthetic data. Differences are not "
            "proven causal effects or clinically "
            "validated risks."
        ),
    }