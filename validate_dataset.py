import pandas as pd
from services.user import get_user_data
from services.analytics import discover_headache_relationships

def run_validation():
    print("Starting Dataset Validation...\n")
    df = pd.read_csv("data/health_data.csv")

    # Schema
    expected_cols = ["user_id", "date", "sleep_hours", "hydration_liters", "stress", "activity_steps", "caffeine", "headache"]
    for col in expected_cols:
        assert col in df.columns, f"Missing column: {col}"

    # Users
    users = df["user_id"].unique()
    assert len(users) == 8, f"Expected 8 users, got {len(users)}"
    
    # Rows per user & Missing Values
    assert df.isnull().sum().sum() == 0, "Found unexpected missing values"
    
    for user in users:
        user_df = get_user_data(df, user)
        assert len(user_df) == 150, f"Expected 150 days for {user}, got {len(user_df)}"

    # Relationships validation
    # U001 -> sleep should be top
    u1_rels = discover_headache_relationships(get_user_data(df, "U001"))
    assert u1_rels[0]["feature"] == "sleep_hours", "U001 should be sleep-sensitive"

    # U002 -> stress should be top
    u2_rels = discover_headache_relationships(get_user_data(df, "U002"))
    assert u2_rels[0]["feature"] == "stress", "U002 should be stress-sensitive"

    # U003 -> hydration should be top
    u3_rels = discover_headache_relationships(get_user_data(df, "U003"))
    assert u3_rels[0]["feature"] == "hydration_liters", "U003 should be hydration-sensitive"
    
    # U004 -> caffeine should be top
    u4_rels = discover_headache_relationships(get_user_data(df, "U004"))
    assert u4_rels[0]["feature"] == "caffeine", "U004 should be caffeine-sensitive"
    
    print("Validation passed successfully! All intended user profiles behave as expected.")

if __name__ == "__main__":
    run_validation()
