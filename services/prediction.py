
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

# Keep these unchanged for your existing headache API.
FEATURES = [
    "sleep_hours",
    "hydration_liters",
    "stress",
    "activity_steps",
    "caffeine"
]

# Expanded features for the new prediction engine.
HEALTH_FEATURES = FEATURES + [
    "heart_rate",
    "resting_hr",
    "systolic_bp",
    "diastolic_bp",
    "weight_kg",
    "temperature_c",
    "calories",
    "sleep_quality",
    "recovery"
]

TARGETS = [
    "headache",
    "bp_elevation",
    "fatigue",
    "dehydration_risk",
    "poor_sleep",
    "stress_overload",
    "recovery_deterioration"
]


def make_model():
    return RandomForestClassifier(
        n_estimators=150,
        random_state=42,
        class_weight="balanced",
        min_samples_leaf=3
    )


# Existing functions: preserved for compatibility.

def train_model(df):
    model = make_model()
    model.fit(df[FEATURES], df["headache"])
    return model


def predict_headache(model, health_data):
    inputs = pd.DataFrame([health_data])[FEATURES]

    probabilities = model.predict_proba(inputs)[0]
    classes = list(model.classes_)

    if 1 not in classes:
        return 0.0

    return float(probabilities[classes.index(1)])


def explain_prediction(model, health_data):
    explanations = []

    for feature, importance in zip(
        FEATURES, model.feature_importances_
    ):
        explanations.append({
            "feature": feature,
            "importance": round(float(importance), 3),
            "current_value": health_data[feature]
        })

    return sorted(
        explanations,
        key=lambda item: item["importance"],
        reverse=True
    )


# New multi-outcome prediction engine.

def train_models(df, user_id=None):
    """
    Train separate models for seven synthetic outcomes.

    When a user_id is supplied, train on that user's
    historical records instead of pooling all users.
    """
    if user_id is not None:
        df = df[df["user_id"] == user_id].copy()

    if df.empty:
        raise ValueError("No training records found")

    models = {}

    for target in TARGETS:
        model = make_model()

        # A single-class target cannot train a useful
        # classifier, so retain its observed frequency.
        if df[target].nunique() < 2:
            models[target] = {
                "model": None,
                "observed_rate": float(df[target].mean())
            }
            continue

        model.fit(df[HEALTH_FEATURES], df[target])

        models[target] = {
            "model": model,
            "observed_rate": float(df[target].mean())
        }

    return models


def predict_all(models, health_data):
    inputs = pd.DataFrame([health_data])[HEALTH_FEATURES]
    predictions = {}

    for target, entry in models.items():
        model = entry["model"]

        if model is None:
            probability = entry["observed_rate"]
        else:
            probabilities = model.predict_proba(inputs)[0]
            classes = list(model.classes_)

            probability = (
                float(probabilities[classes.index(1)])
                if 1 in classes else 0.0
            )

        predictions[target] = round(
            probability * 100, 1
        )

    return predictions


def explain_all(models, health_data):
    explanations = {}

    for target, entry in models.items():
        model = entry["model"]

        if model is None:
            explanations[target] = []
            continue

        ranked = sorted(
            zip(
                HEALTH_FEATURES,
                model.feature_importances_
            ),
            key=lambda item: item[1],
            reverse=True
        )

        explanations[target] = [
            {
                "feature": feature,
                "importance": round(float(importance), 3),
                "current_value": float(health_data[feature])
            }
            for feature, importance in ranked[:5]
        ]

    return explanations