import pandas as pd
import numpy as np

def calculate_baseline(df):
    """
    Calculate the individual's normal health values
    from their historical data.
    """
    return {
        "sleep_hours": round(float(df["sleep_hours"].mean()), 2),
        "hydration_liters": round(float(df["hydration_liters"].mean()), 2),
        "stress": round(float(df["stress"].mean()), 2),
        "activity_steps": round(float(df["activity_steps"].mean()), 2),
        "caffeine": round(float(df["caffeine"].mean()), 2)
    }

def calculate_population_baseline(df):
    """
    Calculate the population average across all users.
    """
    return calculate_baseline(df)

def compare_to_baseline(current, baseline):
    """
    Compare today's health values against the baseline,
    returning structured deviations.
    """
    comparison = {}
    for key in baseline:
        if key in current:
            b = baseline[key]
            c = current[key]
            diff = c - b
            pct = (diff / b * 100) if b != 0 else 0.0
            
            comparison[key] = {
                "current": round(float(c), 2),
                "baseline": round(float(b), 2),
                "difference": round(float(diff), 2),
                "percent_difference": round(float(pct), 1)
            }
    return comparison

def headache_sleep_pattern(df):
    """
    Find how often headaches occurred after below-average sleep.
    """
    headache_days = df[df["headache"] == 1]
    
    if len(headache_days) == 0:
        return {
            "total_headaches": 0,
            "below_average_sleep": 0,
            "percentage": 0.0
        }
        
    personal_sleep_baseline = df["sleep_hours"].mean()
    below_average = (headache_days["sleep_hours"] < personal_sleep_baseline)
    
    count = int(below_average.sum())
    percentage = (count / len(headache_days)) * 100
    
    return {
        "total_headaches": len(headache_days),
        "below_average_sleep": count,
        "percentage": round(percentage, 1)
    }

def discover_headache_relationships(df):
    """
    Discover relationships between health variables
    and headache events using correlation.
    Returns structured patterns with qualitative labels.
    """
    features = [
        "sleep_hours",
        "hydration_liters",
        "stress",
        "activity_steps",
        "caffeine"
    ]
    
    relationships = []
    
    for feature in features:
        # Handle cases where standard deviation is zero or data is too uniform
        if df[feature].std() == 0 or df["headache"].std() == 0:
            correlation = 0.0
        else:
            correlation = df[feature].corr(df["headache"])
            if np.isnan(correlation):
                correlation = 0.0
            
        strength = abs(float(correlation))
        
        direction = "negative" if correlation < 0 else "positive"
        label = relationship_label(strength)
        
        relationships.append({
            "feature": feature,
            "correlation": round(float(correlation), 3),
            "direction": direction,
            "strength": round(strength, 3),
            "label": label
        })
        
    # Strongest relationships first
    relationships.sort(key=lambda x: x["strength"], reverse=True)
    return relationships

def relationship_label(strength):
    """
    Label the strength of the statistical association.
    """
    if strength >= 0.5:
        return "Strong"
    elif strength >= 0.3:
        return "Moderate"
    elif strength >= 0.15:
        return "Weak"
    else:
        return "Very Weak"
