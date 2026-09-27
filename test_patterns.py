from data.loader import load_health_data
from services.analytics import headache_sleep_pattern

df = load_health_data("data/health_data.csv")
from services.user import get_user_data
user_df = get_user_data(df, "U001")
result = headache_sleep_pattern(user_df)

print("\n========== PERSONAL PATTERN DISCOVERY ==========\n")
print(f"Total headache events: {result['total_headaches']}")
print(f"Headaches after below-average sleep: {result['below_average_sleep']}")
print(f"Percentage: {result['percentage']}%")
print("\nLifePrint learned:")
print(
    f"{result['percentage']}% of your recorded "
    f"headaches occurred after below-average sleep."
)