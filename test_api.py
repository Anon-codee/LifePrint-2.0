from fastapi.testclient import TestClient
from main import app

def run_all_tests():
    with TestClient(app) as client:
        # Pass client explicitly to tests or run inline
        response = client.get("/api/health")
        assert response.status_code == 200, "Health check failed"
        
        response = client.get("/api/users")
        assert response.status_code == 200, "List users failed"
        assert len(response.json()["users"]) > 0

        response = client.get("/api/users/U001")
        assert response.status_code == 200, "Get user failed"
        
        response = client.get("/api/users/INVALID/today")
        assert response.status_code == 404, "Invalid user handling failed"
        
        response = client.get("/api/users/U001/today")
        assert response.status_code == 200, "Today failed"
        
        response = client.get("/api/users/U001/baseline")
        assert response.status_code == 200, "Baseline failed"
        
        response = client.get("/api/users/U001/patterns")
        assert response.status_code == 200, "Patterns failed"
        
        response = client.get("/api/users/U001/prediction")
        assert response.status_code == 200, "Prediction failed"
        
        response = client.get("/api/users/U001/prediction/explanation")
        assert response.status_code == 200, "Prediction explanation failed"
        
        response = client.get("/api/users/U001/graph")
        assert response.status_code == 200, "Graph failed"
        
        payload = {
            "sleep_hours": 8.0,
            "hydration_liters": 2.5,
            "stress": 3.0,
            "activity_steps": 10000,
            "caffeine": 1.0
        }
        response = client.post("/api/users/U001/what-if", json=payload)
        assert response.status_code == 200, "What-If failed"

        print("All API tests passed!")

if __name__ == "__main__":
    run_all_tests()
