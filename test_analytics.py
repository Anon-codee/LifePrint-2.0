import pandas as pd
from data.loader import load_health_data
from services.analytics import calculate_baseline, compare_to_baseline

df = load_health_data("data/health_data.csv")
from services.user import get_user_data
user_df = get_user_data(df, "U001")
baseline = calculate_baseline(user_df)

today = {
    "sleep_hours": 5.2,
    "hydration_liters": 1.4,
    "stress": 8,
    "activity_steps": 4000,
    "caffeine": 3
}

comparison = compare_to_baseline(today, baseline)

print("\n========== TODAY VS YOUR BASELINE ==========\n")

for metric, data in comparison.items():
    difference = data["percent_difference"]
    if difference > 0:
        print(f"{metric}: {difference}% above baseline")
    else:
        print(f"{metric}: {abs(difference)}% below baseline")