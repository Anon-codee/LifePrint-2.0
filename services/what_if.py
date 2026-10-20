from services.prediction import predict_headache

def simulate_what_if(
    model,
    current_health,
    sleep,
    hydration,
    stress,
    activity,
    caffeine
):
    """
    Run the prediction model using hypothetical health values
    and compare against the current prediction.
    """
    current_risk = predict_headache(model, current_health)

    hypothetical_health = {
        "sleep_hours": sleep,
        "hydration_liters": hydration,
        "stress": stress,
        "activity_steps": activity,
        "caffeine": caffeine
    }
    
    simulated_risk = predict_headache(model, hypothetical_health)

    return {
        "current_risk": current_risk,
        "simulated_risk": simulated_risk,
        "difference": simulated_risk - current_risk
    }
