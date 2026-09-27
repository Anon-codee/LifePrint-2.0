from data.loader import load_health_data
from services.prediction import train_model
from services.what_if import simulate_what_if

df = load_health_data("data/health_data.csv")
model = train_model(df)

current = {
    "sleep_hours": 5.2,
    "hydration_liters": 1.4,
    "stress": 8,
    "activity_steps": 4000,
    "caffeine": 3
}

result = simulate_what_if(
    model=model,
    current_health=current,
    sleep=8.0,
    hydration=2.5,
    stress=3,
    activity=7000,
    caffeine=1
)

print("\n========== WHAT-IF SIMULATION ==========\n")
print(f"Current headache likelihood: {result['current_risk'] * 100:.1f}%")
print(f"Simulated headache likelihood: {result['simulated_risk'] * 100:.1f}%")

print(
    f"\nChange in model estimate: "
    f"{result['difference'] * 100:+.1f} percentage points"
)