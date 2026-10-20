"""
Integration test for LifePrint 3.0 Digital Twin Status endpoint.
"""

from fastapi.testclient import TestClient
from main import app

def run_tests():
    print("Testing Twin Status endpoint...")
    with TestClient(app) as client:
        # Test 1: GET /api/users/U001/twin-status
        res = client.get("/api/users/U001/twin-status")
        assert res.status_code == 200, f"GET twin-status failed: {res.text}"
        data = res.json()

        assert data["user_id"] == "U001"
        assert "condition" in data
        assert data["condition"]["id"] == "cardiovascular_bp"

        # Check data availability (Constraint 10)
        da = data["data_availability"]
        assert da["total_days_recorded"] == 150
        assert da["historical_training_days"] == 149
        assert da["baseline_available"] is True
        assert "limitations_note" in da

        # Check primary signals (Constraint 6: systolic, diastolic, resting HR, activity, stress)
        primary = data["primary_signals"]
        primary_names = [s["signal"] for s in primary]
        for expected in ["systolic_bp", "diastolic_bp", "resting_hr", "activity_steps", "stress"]:
            assert expected in primary_names, f"Expected {expected} in primary signals"

        # Check supporting signals (Constraint 6: heart rate, sleep, caffeine, recovery)
        supporting = data["supporting_signals"]
        supporting_names = [s["signal"] for s in supporting]
        for expected in ["heart_rate", "sleep_hours", "caffeine", "recovery"]:
            assert expected in supporting_names, f"Expected {expected} in supporting signals"

        # Check exploratory flag presence (Constraint 9)
        for s in primary:
            assert "exploratory_flag" in s
            assert "user_reference_range" in s
            assert "meaning_note" in s["user_reference_range"]

        # Check synthetic model estimate for bp_elevation (Constraint 8)
        sme = data["synthetic_model_estimate"]
        assert sme["target"] == "bp_elevation"
        assert sme["model_available"] is True
        assert isinstance(sme["synthetic_probability_percent"], (int, float))
        assert "disclaimer" in sme
        assert "exploratory_frequency_band" in sme

        # Check discovered patterns non-causal disclaimer (Constraint 8)
        dp = data["discovered_patterns"]
        assert "interpretation_note" in dp

        # Check prominent disclaimer (Constraint 12)
        assert "disclaimer" in data

        # Test 2: Invalid user ID returns 404
        res = client.get("/api/users/INVALID/twin-status")
        assert res.status_code == 404, "Invalid user ID should return 404"

        print("Twin Status tests passed successfully!")

if __name__ == "__main__":
    run_tests()
