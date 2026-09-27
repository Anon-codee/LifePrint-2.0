from data.loader import load_health_data
from services.analytics import (
    discover_headache_relationships,
    relationship_label
)

df = load_health_data("data/health_data.csv")
from services.user import get_user_data
user_df = get_user_data(df, "U001")
relationships = discover_headache_relationships(user_df)

print("\n========== PERSONAL HEALTH RELATIONSHIPS ==========\n")
for relationship in relationships:
    feature = relationship["feature"]
    correlation = relationship["correlation"]
    strength = relationship["strength"]
    label = relationship["label"]

    print(
        f"{feature:20} "
        f"correlation: {correlation:+.3f} "
        f"strength: {strength:.3f} "
        f"({label})"
    )