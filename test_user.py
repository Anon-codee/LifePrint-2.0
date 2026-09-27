import json
from data.loader import load_health_data
from services.user import get_user_health_summary

def run_test():
    df = load_health_data("data/health_data.csv")
    
    # Test User Summary structure
    summary = get_user_health_summary(df, "U001")
    
    # Dump to JSON to ensure it's JSON serializable
    json_summary = json.dumps(summary, indent=2)
    print("\n========== USER SUMMARY (JSON) ==========\n")
    print(json_summary)
    
    assert summary["user_id"] == "U001"
    assert "today" in summary
    assert "personal_baseline" in summary
    assert "population_baseline" in summary
    assert "deviations" in summary
    assert "patterns" in summary
    assert "evidence" in summary
    
    print("\nUser summary functionality is working perfectly and is JSON serializable.")

if __name__ == "__main__":
    run_test()
