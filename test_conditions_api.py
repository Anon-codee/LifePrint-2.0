"""
Integration test for LifePrint 3.0 Condition API endpoints.
"""

from fastapi.testclient import TestClient
from main import app

def run_tests():
    print("Testing Conditions API endpoints...")
    with TestClient(app) as client:
        # Test 1: GET /api/conditions
        res = client.get("/api/conditions")
        assert res.status_code == 200, "GET /api/conditions failed"
        body = res.json()
        assert "conditions" in body
        conditions = body["conditions"]
        assert len(conditions) > 0
        cardio = next((c for c in conditions if c["id"] == "cardiovascular_bp"), None)
        assert cardio is not None, "cardiovascular_bp condition must exist"
        assert "systolic_bp" in cardio["primary_signals"]
        assert "bp_elevation" in cardio["target_outcomes"]
        assert "disclaimer" in body

        # Test 2: GET /api/users/{user_id}/condition
        res = client.get("/api/users/U001/condition")
        assert res.status_code == 200, "GET user condition failed"
        u_cond = res.json()
        assert u_cond["user_id"] == "U001"
        assert u_cond["active_condition_id"] == "cardiovascular_bp"
        assert "disclaimer" in u_cond

        # Test 3: Unknown user ID returns 404
        res = client.get("/api/users/INVALID_USER/condition")
        assert res.status_code == 404, "Invalid user should return 404"

        # Test 4: POST /api/users/{user_id}/condition
        update_payload = {
            "condition_id": "cardiovascular_bp",
            "notes": "Cardio focus set for prototype",
            "custom_reference_ranges": {
                "systolic_bp": {"min": 92.0, "max": 128.0, "label": "Self-selected systolic"}
            }
        }
        res = client.post("/api/users/U001/condition", json=update_payload)
        assert res.status_code == 200, "POST user condition failed"
        post_body = res.json()
        assert post_body["status"] == "success"
        assert post_body["profile"]["notes"] == "Cardio focus set for prototype"

        # Test 5: POST with invalid condition returns 400
        res = client.post("/api/users/U001/condition", json={"condition_id": "unknown_cond"})
        assert res.status_code == 400, "Invalid condition ID should return 400"

        # Test 6: POST with invalid user returns 404
        res = client.post("/api/users/INVALID_USER/condition", json={"condition_id": "cardiovascular_bp"})
        assert res.status_code == 404, "Invalid user on POST should return 404"

        print("Conditions API tests passed successfully!")

if __name__ == "__main__":
    run_tests()
