from data.loader import load_health_data
from services.prediction import (
    train_model,
    predict_headache,
    explain_prediction
)

df = load_health_data("data/health_data.csv")
model = train_model(df)

today = {
    "sleep_hours": 5.2,
    "hydration_liters": 1.4,
    "stress": 8,
    "activity_steps": 4000,
    "caffeine": 3
}

risk = predict_headache(model, today)
explanations = explain_prediction(model, today)

print("\n========== LIFEPRINT PREDICTION ==========\n")
print(f"Estimated headache likelihood: {risk * 100:.1f}%")

print("\n========== WHY THIS PREDICTION? ==========\n")
for item in explanations:
    print(
        f"{item['feature']:20} "
        f"importance: {item['importance']:.3f}"
    )