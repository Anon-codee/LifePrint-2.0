import pandas as pd
import numpy as np

np.random.seed(42)

def generate_ar1(n, mean, std, phi=0.5):
    """Generate time series with AR(1) longitudinal smoothing."""
    # base noise
    noise = np.random.normal(0, std * np.sqrt(1 - phi**2), n)
    x = np.zeros(n)
    x[0] = noise[0] + mean
    for t in range(1, n):
        x[t] = mean + phi * (x[t-1] - mean) + noise[t]
    return x

# Define User Profiles
USER_PROFILES = {
    "U001": {
        "desc": "Sleep-sensitive",
        "w_sleep": 2.5, "w_stress": 0.2, "w_hydration": 0.2, "w_caffeine": 0.2, "w_activity": 0.0,
        "base_prob": -1.5
    },
    "U002": {
        "desc": "Stress-sensitive",
        "w_sleep": 0.2, "w_stress": 2.5, "w_hydration": 0.2, "w_caffeine": 0.2, "w_activity": 0.0,
        "base_prob": -1.5
    },
    "U003": {
        "desc": "Hydration-sensitive",
        "w_sleep": 0.2, "w_stress": 0.2, "w_hydration": 2.5, "w_caffeine": 0.2, "w_activity": 0.0,
        "base_prob": -1.5
    },
    "U004": {
        "desc": "Caffeine-sensitive",
        "w_sleep": 0.2, "w_stress": 0.2, "w_hydration": 0.2, "w_caffeine": 2.5, "w_activity": 0.0,
        "base_prob": -2.0
    },
    "U005": {
        "desc": "Mixed-pattern user",
        "w_sleep": 1.0, "w_stress": 1.0, "w_hydration": 1.0, "w_caffeine": 0.2, "w_activity": 0.0,
        "base_prob": -1.5
    },
    "U006": {
        "desc": "Weak/noisy relationship",
        "w_sleep": 0.1, "w_stress": 0.1, "w_hydration": 0.1, "w_caffeine": 0.1, "w_activity": 0.1,
        "base_prob": -1.0,
        "noise_scale": 3.0
    },
    "U007": {
        "desc": "Stable user",
        "w_sleep": 0.5, "w_stress": 0.5, "w_hydration": 0.5, "w_caffeine": 0.5, "w_activity": 0.0,
        "base_prob": -2.5
    },
    "U008": {
        "desc": "Activity-sensitive",
        "w_sleep": 0.5, "w_stress": 0.5, "w_hydration": 0.5, "w_caffeine": 0.0, "w_activity": -2.5,
        "base_prob": -1.0
    }
}

days = 150
dates = pd.date_range(end=pd.Timestamp.today().normalize(), periods=days)
all_data = []

for uid, profile in USER_PROFILES.items():
    sleep = np.clip(generate_ar1(days, 7, 1.1, phi=0.6), 4, 9)
    hydration = np.clip(generate_ar1(days, 2.0, 0.5, phi=0.6), 0.8, 3.5)
    stress = np.clip(generate_ar1(days, 5, 2, phi=0.7), 1, 10)
    activity = np.clip(generate_ar1(days, 7000, 1800, phi=0.5), 1000, 12000)
    caffeine = np.clip(generate_ar1(days, 2, 1, phi=0.3), 0, 5)

    noise_scale = profile.get("noise_scale", 1.0)
    
    # Calculate score. Higher = more headache.
    # Sleep is good, Stress is bad, Hydration is good, Caffeine is bad, Activity is good.
    score = (
        profile["base_prob"]
        + profile["w_sleep"] * (7 - sleep)
        + profile["w_stress"] * (stress - 5) / 2
        + profile["w_hydration"] * (2 - hydration) / 0.5
        + profile["w_caffeine"] * (caffeine - 2)
        + profile["w_activity"] * (7000 - activity) / 1800
        + np.random.normal(0, noise_scale, days)
    )

    prob = 1 / (1 + np.exp(-score))
    
    # Target roughly 25% overall prevalence
    headache = (np.random.random(days) < (prob * 0.8)).astype(int)

    df_user = pd.DataFrame({
        "user_id": uid,
        "date": dates,
        "sleep_hours": np.round(sleep, 2),
        "hydration_liters": np.round(hydration, 2),
        "stress": np.round(stress, 1),
        "activity_steps": activity.astype(int),
        "caffeine": np.round(caffeine, 1),
        "headache": headache
    })
    
    all_data.append(df_user)

df_final = pd.concat(all_data, ignore_index=True)
df_final.to_csv("data/health_data.csv", index=False)

print("\nMulti-User LifePrint dataset created!")
print(f"Generated {len(USER_PROFILES)} users")
print(f"{days} days/user")
print(f"{len(df_final)} total records")
print(f"Headache prevalence: {df_final['headache'].mean()*100:.1f}%\n")

print("User Profiles:")
for uid, profile in USER_PROFILES.items():
    user_data = df_final[df_final["user_id"] == uid]
    print(f"{uid} -> {profile['desc']} (Headaches: {user_data['headache'].sum()})")