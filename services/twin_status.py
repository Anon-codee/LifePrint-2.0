"""
Condition-Focused Health Digital Twin Status Service for LifePrint 3.0.

Computes adaptive condition-specific twin telemetry, separating:
1. Latest observed synthetic readings
2. Historical 30-day personal baseline (with data freshness, validity counts, and status)
3. Percentage deviations from personal baseline (with exploratory research flags & persistent shift detection)
4. Optional user-configured reference markers (self-selected reference markers, NOT medical targets)
5. Experimental synthetic-model estimate for condition target (e.g. bp_elevation or headache)
6. Data availability & limitations metrics (reporting exact counts without claiming clinical reliability)
7. Condition-aware structured insights distinguishing deviation, correlation, and model prediction
8. Discovered lag-1 associations (statistical correlations, NOT causal claims)
9. Prominent synthetic-data research disclaimers
"""

import pandas as pd
from typing import Any, Dict, List, Optional

from services.conditions import get_condition, DEFAULT_CONDITION_ID
from services.profile_store import get_user_profile
from services.baseline import calculate_baselines, is_valid_reading
from services.prediction import HEALTH_FEATURES, train_models, predict_all, explain_all
from services.patterns import discover_patterns

SIGNAL_LABELS: Dict[str, Dict[str, str]] = {
    "systolic_bp": {"label": "Systolic BP", "unit": "mmHg"},
    "diastolic_bp": {"label": "Diastolic BP", "unit": "mmHg"},
    "resting_hr": {"label": "Resting HR", "unit": "bpm"},
    "activity_steps": {"label": "Activity", "unit": "steps"},
    "stress": {"label": "Stress", "unit": "/10"},
    "heart_rate": {"label": "Heart Rate", "unit": "bpm"},
    "sleep_hours": {"label": "Sleep", "unit": "h"},
    "caffeine": {"label": "Caffeine", "unit": "servings"},
    "recovery": {"label": "Recovery", "unit": "/100"},
    "weight_kg": {"label": "Weight", "unit": "kg"},
    "temperature_c": {"label": "Temperature", "unit": "°C"},
    "calories": {"label": "Calories", "unit": "kcal"},
    "sleep_quality": {"label": "Sleep Quality", "unit": "/100"},
    "hydration_liters": {"label": "Hydration", "unit": "L"},
}


def generate_condition_insights(
    condition: Dict[str, Any],
    primary_signals: List[Dict[str, Any]],
    synthetic_model: Dict[str, Any],
    patterns: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Generate condition-aware insights categorized strictly by evidence type:
    - deviation: observed value vs historical baseline
    - correlation: observed next-day association in historical callsets
    - model_prediction: multi-variable model estimate
    Avoids causal claims and medical diagnostic language.
    """
    insights: List[Dict[str, Any]] = []

    # 1. Deviations & Persistent Shifts
    for sig in primary_signals:
        dev_pct = sig.get("deviation_percent")
        p_shift = sig.get("persistent_deviation", {})
        label = sig["label"]
        current = sig["current"]
        baseline = sig["baseline"]
        unit = sig["unit"]
        status = sig.get("baseline_status", "provisional")
        n_obs = sig.get("valid_observations", 0)

        if p_shift.get("detected"):
            insights.append({
                "insight_type": "deviation",
                "subtype": "persistent_shift",
                "title": f"Sustained {p_shift['direction'].title()} {label}",
                "signal": sig["signal"],
                "summary": (
                    f"{label} has remained {p_shift['direction']} over {p_shift['consecutive_days']} consecutive observations "
                    f"(average deviation: {p_shift['average_deviation_percent']:+0.1f}%)."
                ),
                "evidence": {
                    "current_observed": current,
                    "baseline": baseline,
                    "unit": unit,
                    "consecutive_deviating_days": p_shift["consecutive_days"],
                    "baseline_status": status,
                    "valid_observations": n_obs,
                },
                "supporting_detail": p_shift["shift_notice"],
                "condition_relevance": f"Prioritized biometric for {condition['name']}.",
            })
        elif sig.get("exploratory_flag", {}).get("active"):
            dir_str = "higher than" if (dev_pct or 0) > 0 else "lower than"
            insights.append({
                "insight_type": "deviation",
                "subtype": "baseline_deviation",
                "title": f"{label} Deviates from 30-Day Baseline",
                "signal": sig["signal"],
                "summary": (
                    f"Latest observed reading ({current} {unit}) is {abs(dev_pct or 0):0.1f}% {dir_str} "
                    f"your personal 30-day baseline ({baseline} {unit})."
                ),
                "evidence": {
                    "current_observed": current,
                    "baseline": baseline,
                    "deviation_percent": dev_pct,
                    "trend": sig.get("trend"),
                    "baseline_status": status,
                    "valid_observations": n_obs,
                },
                "supporting_detail": (
                    "Exploratory research flag triggered (reading differs by >=10% from personal baseline). "
                    "This is an analytical observation, not a clinical alert."
                ),
                "condition_relevance": f"Key tracked signal for {condition['name']}.",
            })

    # 2. Statistical Next-Day Associations (Correlations)
    for p in patterns[:3]:
        insights.append({
            "insight_type": "correlation",
            "subtype": "lag1_association",
            "title": f"{p['signal'].replace('_', ' ').title()} ({p['direction']}) Next-Day Pattern",
            "signal": p["signal"],
            "summary": (
                f"Historical records show that when {p['signal'].replace('_', ' ')} was {p['direction']} baseline, "
                f"{p['outcome'].replace('_', ' ')} occurred on {p['event_rate_exposed']}% of the following days "
                f"vs {p['event_rate_comparison']}% on non-exposed days ({p['difference_percentage_points']:+0.1f} pp difference)."
            ),
            "evidence": {
                "signal": p["signal"],
                "direction": p["direction"],
                "outcome": p["outcome"],
                "exposed_event_rate": p["event_rate_exposed"],
                "comparison_event_rate": p["event_rate_comparison"],
                "difference_percentage_points": p["difference_percentage_points"],
                "observations_evaluated": p.get("observations", 0),
            },
            "supporting_detail": (
                "Observed statistical association in synthetic longitudinal data with a 1-day lag. "
                "This correlation does not establish a causal mechanism or diagnostic link."
            ),
            "condition_relevance": f"Statistical relationship relevant to {condition['name']} target outcomes.",
        })

    # 3. Model Prediction Insight
    if synthetic_model.get("model_available") and synthetic_model.get("synthetic_probability_percent") is not None:
        target_name = synthetic_model.get("target_label", "Target Outcome")
        prob = synthetic_model["synthetic_probability_percent"]
        band = synthetic_model.get("exploratory_frequency_band", "").replace("_", " ")
        top_factors = synthetic_model.get("contributing_factors", [])

        factor_summary = ", ".join(
            [f"{f['feature'].replace('_', ' ')} ({int(f['importance'] * 100)}% importance)" for f in top_factors[:3]]
        )

        insights.append({
            "insight_type": "model_prediction",
            "subtype": "random_forest_inference",
            "title": f"Synthetic {target_name} Model Estimate: {prob:0.1f}%",
            "signal": condition["primary_signals"][0] if condition.get("primary_signals") else "model_target",
            "summary": (
                f"The synthetic Random Forest model estimates a {prob:0.1f}% likelihood of {target_name.lower()} "
                f"for today's feature vector (categorized in the {band})."
            ),
            "evidence": {
                "target": synthetic_model.get("target"),
                "probability_percent": prob,
                "frequency_band": band,
                "top_contributing_features": top_factors[:3],
            },
            "supporting_detail": (
                f"Influenced most heavily by: {factor_summary}. "
                "This is an experimental machine learning probability estimate on synthetic records, "
                "not a validated clinical risk score or medical diagnosis."
            ),
            "condition_relevance": f"Primary synthetic outcome monitored for {condition['name']}.",
        })

    return insights


def build_twin_status(df: pd.DataFrame, user_id: str) -> Dict[str, Any]:
    """
    Assemble the adaptive condition-specific digital twin status for a user.
    """
    valid_users = df["user_id"].unique().tolist()
    if user_id not in valid_users:
        raise ValueError(f"User {user_id} not found in dataset.")

    # 1. Fetch user persistent profile and condition definition
    profile = get_user_profile(user_id, valid_user_ids=valid_users)
    active_condition_id = profile.get("active_condition_id", DEFAULT_CONDITION_ID)
    condition = get_condition(active_condition_id)
    if not condition:
        condition = get_condition(DEFAULT_CONDITION_ID)

    user_df = df[df["user_id"] == user_id].copy()
    user_df["date"] = pd.to_datetime(user_df["date"])
    # Deduplicate dates keeping the latest
    user_df = user_df.sort_values("date").drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)

    total_days = len(user_df)
    if total_days < 7:
        raise ValueError(f"At least 7 days of historical data are required for user {user_id}.")

    # Reserve latest record for current status, use previous records for historical modeling
    history = user_df.iloc[:-1].copy()
    latest = user_df.iloc[-1]
    today_str = latest["date"].strftime("%Y-%m-%d")

    # Reference dataset date (Requirement A.2)
    all_dates = pd.to_datetime(df["date"])
    reference_dataset_date = all_dates.max()
    reference_date_str = reference_dataset_date.strftime("%Y-%m-%d")

    # 2. Data Availability and Limitations Reporting (Constraint 10)
    history_count = len(history)
    baseline_window_days = 30
    model_trained = history_count >= 14
    data_availability = {
        "total_days_recorded": total_days,
        "historical_training_days": history_count,
        "baseline_window_days": baseline_window_days,
        "dataset_reference_date": reference_date_str,
        "freshness_note": (
            f"Observation freshness is evaluated relative to dataset reference date {reference_date_str}, "
            "not host machine clock time. All data is historical synthetic demo data."
        ),
        "baseline_available": history_count >= 7,
        "trend_comparison_available": history_count >= 14,
        "synthetic_model_available": model_trained,
        "limitations_note": (
            f"Based on {total_days} synthetic observations. "
            "Data counts reflect synthetic record volume and do not constitute clinical validation or verified statistical power."
        ),
    }

    # 3. Calculate Personal Baselines (Using enhanced services.baseline)
    baseline_data = calculate_baselines(user_df, user_id, window_days=baseline_window_days)
    all_signals = baseline_data.get("signals", {})

    primary_signals_keys = condition.get("primary_signals", [])
    supporting_signals_keys = condition.get("supporting_signals", [])
    custom_ranges = profile.get("custom_reference_ranges", {})

    def package_signal(signal_key: str, is_primary: bool) -> Dict[str, Any]:
        info = all_signals.get(signal_key, {})
        current_val = float(latest[signal_key]) if is_valid_reading(signal_key, latest.get(signal_key)) else None
        baseline_val = info.get("baseline")
        deviation_pct = info.get("deviation_percent")
        trend = info.get("trend", "stable")
        trend_change = info.get("trend_change", 0.0)
        volatility = info.get("volatility", 0.0)
        valid_obs = info.get("valid_observations", 0)
        missing_count = info.get("missing_or_invalid_count", 0)
        status_key = info.get("baseline_status", "provisional")
        status_desc = info.get("status_description", "")
        age_days = info.get("age_days", 0)
        latest_obs_date = info.get("latest_observation_date", today_str)
        p_shift = info.get("persistent_deviation", {})

        # Exploratory research flag (10% deviation indicator, NOT a medical alert)
        is_exploratory_flag = False
        if deviation_pct is not None:
            is_exploratory_flag = abs(deviation_pct) >= 10.0

        # Optional user reference range (user marker, NOT medical target)
        ref_range = custom_ranges.get(signal_key)
        ref_status = "unconfigured"
        if ref_range and "min" in ref_range and "max" in ref_range and current_val is not None:
            r_min = float(ref_range["min"])
            r_max = float(ref_range["max"])
            if current_val < r_min:
                ref_status = "below_reference"
            elif current_val > r_max:
                ref_status = "above_reference"
            else:
                ref_status = "within_reference"

        meta = SIGNAL_LABELS.get(signal_key, {"label": signal_key.replace("_", " ").title(), "unit": ""})

        return {
            "signal": signal_key,
            "label": meta["label"],
            "unit": meta["unit"],
            "role": "primary" if is_primary else "supporting",
            "current": current_val,
            "baseline": baseline_val,
            "deviation_percent": deviation_pct,
            "trend": trend,
            "trend_change": trend_change,
            "volatility": volatility,
            "valid_observations": valid_obs,
            "missing_or_invalid_count": missing_count,
            "baseline_status": status_key,
            "status_description": status_desc,
            "latest_observation_date": latest_obs_date,
            "age_days": age_days,
            "persistent_deviation": p_shift,
            "exploratory_flag": {
                "active": is_exploratory_flag,
                "label": "10% baseline deviation (research indicator only)",
            },
            "user_reference_range": {
                "configured": ref_range is not None,
                "range": ref_range,
                "comparison": ref_status,
                "meaning_note": "Self-selected user reference marker, NOT a personalized medical target.",
            },
        }

    primary_signals_payload = [
        package_signal(s, is_primary=True) for s in primary_signals_keys if s in all_signals
    ]
    supporting_signals_payload = [
        package_signal(s, is_primary=False) for s in supporting_signals_keys if s in all_signals
    ]

    # 4. Experimental Synthetic Model Estimate for Target Outcome
    primary_target = condition["target_outcomes"][0] if condition.get("target_outcomes") else "bp_elevation"
    synthetic_model_payload = {
        "target": primary_target,
        "target_label": primary_target.replace("_", " ").title(),
        "model_available": False,
        "synthetic_probability_percent": None,
        "exploratory_frequency_band": "insufficient_data",
        "contributing_factors": [],
        "disclaimer": (
            "Experimental model estimate trained on synthetic data. "
            "This is NOT a clinical risk score, diagnosis, or health prognosis."
        ),
    }

    if model_trained:
        models = train_models(history)
        current_inputs = {
            f: float(latest[f]) if is_valid_reading(f, latest.get(f)) else 0.0
            for f in HEALTH_FEATURES
        }
        predictions = predict_all(models, current_inputs)
        explanations = explain_all(models, current_inputs)

        prob = predictions.get(primary_target, 0.0)
        if prob >= 70.0:
            band = "higher_frequency_band"
        elif prob >= 40.0:
            band = "moderate_frequency_band"
        else:
            band = "lower_frequency_band"

        factors = explanations.get(primary_target, [])
        synthetic_model_payload.update({
            "model_available": True,
            "synthetic_probability_percent": prob,
            "exploratory_frequency_band": band,
            "contributing_factors": factors,
        })

    # 5. Discovered Condition Associations (Lag-1)
    condition_patterns = []
    if history_count >= 14:
        all_patterns_data = discover_patterns(history, user_id)
        raw_patterns = all_patterns_data.get("patterns", [])
        condition_patterns = [
            p for p in raw_patterns if p.get("outcome") in condition.get("target_outcomes", [])
        ][:5]

    # 6. Condition-Aware Structured Insights (Phase C)
    condition_insights = generate_condition_insights(
        condition=condition,
        primary_signals=primary_signals_payload,
        synthetic_model=synthetic_model_payload,
        patterns=condition_patterns,
    )

    # 7. What-If Baseline Inputs
    what_if_inputs = {
        "sleep_hours": float(latest["sleep_hours"]) if is_valid_reading("sleep_hours", latest.get("sleep_hours")) else 7.0,
        "hydration_liters": float(latest["hydration_liters"]) if is_valid_reading("hydration_liters", latest.get("hydration_liters")) else 2.0,
        "stress": float(latest["stress"]) if is_valid_reading("stress", latest.get("stress")) else 5.0,
        "activity_steps": int(latest["activity_steps"]) if is_valid_reading("activity_steps", latest.get("activity_steps")) else 7000,
        "caffeine": float(latest["caffeine"]) if is_valid_reading("caffeine", latest.get("caffeine")) else 1.0,
    }

    return {
        "user_id": user_id,
        "date": today_str,
        "dataset_reference_date": reference_date_str,
        "condition": {
            "id": condition["id"],
            "name": condition["name"],
            "tagline": condition.get("tagline", ""),
            "description": condition.get("description", ""),
        },
        "data_availability": data_availability,
        "primary_signals": primary_signals_payload,
        "supporting_signals": supporting_signals_payload,
        "synthetic_model_estimate": synthetic_model_payload,
        "condition_insights": {
            "count": len(condition_insights),
            "insights": condition_insights,
            "categorization_guide": (
                "Insights are categorized as 'deviation' (comparing current reading with personal baseline), "
                "'correlation' (statistical next-day association in historical records), or 'model_prediction' "
                "(Random Forest probability estimate). None represent proven causal effects or clinical diagnoses."
            ),
        },
        "discovered_patterns": {
            "count": len(condition_patterns),
            "patterns": condition_patterns,
            "interpretation_note": (
                "Observed next-day statistical associations in synthetic records. "
                "These associations do not represent proven causal effects or clinical mechanisms."
            ),
        },
        "what_if_reference_inputs": what_if_inputs,
        "disclaimer": (
            "LifePrint 3.0 research prototype. All health records, model inferences, "
            "and physiological patterns are synthetic. This system does not deliver clinical advice, "
            "diagnoses, or validated medical predictions."
        ),
    }
