"""
Adaptive Personal Baseline Engine for LifePrint 3.0.

Calculates personalized historical baselines, data freshness, and sufficiency metrics.
Features:
- Configurable rolling window and recency weighting
- Plausible signal range validation to reject corrupt or invalid readings
- Safe handling of zero baselines, missing values, and duplicate dates
- Strict current-day exclusion to prevent data leakage
- Relative freshness calculation based on dataset reference date (NOT host clock)
- Baseline maturity status: insufficient (<7), provisional (7-13), developing (14-27), established (>=28)
- Persistent deviation / baseline shift detection for sustained changes

DISCLAIMER: This is a research prototype evaluating synthetic data.
Baselines represent statistical benchmarks, not clinical norms or medical guidelines.
"""

from datetime import datetime
import math
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd

SIGNALS = [
    "sleep_hours",
    "hydration_liters",
    "stress",
    "activity_steps",
    "caffeine",
    "heart_rate",
    "resting_hr",
    "systolic_bp",
    "diastolic_bp",
    "weight_kg",
    "temperature_c",
    "calories",
    "sleep_quality",
    "recovery",
]

# Physical plausibility boundaries to filter corrupted or impossible readings
SIGNAL_BOUNDS: Dict[str, Tuple[float, float]] = {
    "sleep_hours": (0.0, 24.0),
    "hydration_liters": (0.0, 15.0),
    "stress": (0.0, 10.0),
    "activity_steps": (0.0, 150000.0),
    "caffeine": (0.0, 30.0),
    "heart_rate": (30.0, 240.0),
    "resting_hr": (30.0, 160.0),
    "systolic_bp": (50.0, 260.0),
    "diastolic_bp": (30.0, 160.0),
    "weight_kg": (20.0, 400.0),
    "temperature_c": (33.0, 44.0),
    "calories": (0.0, 15000.0),
    "sleep_quality": (0.0, 100.0),
    "recovery": (0.0, 100.0),
}


def is_valid_reading(signal: str, value: Any) -> bool:
    """Validate whether a value is numeric, finite, and within physical bounds."""
    if value is None or pd.isna(value):
        return False
    try:
        f_val = float(value)
        if not math.isfinite(f_val):
            return False
        bounds = SIGNAL_BOUNDS.get(signal)
        if bounds:
            return bounds[0] <= f_val <= bounds[1]
        return True
    except (ValueError, TypeError):
        return False


def get_baseline_status(valid_count: int) -> Tuple[str, str]:
    """
    Determine baseline maturity status based on valid observation count.
    Returns (status_key, description).
    """
    if valid_count < 7:
        return (
            "insufficient",
            "Fewer than 7 valid observations. Insufficient data to compute a reliable baseline.",
        )
    if valid_count < 14:
        return (
            "provisional",
            "7–13 valid observations. Preliminary baseline computed; highly sensitive to single-reading noise.",
        )
    if valid_count < 28:
        return (
            "developing",
            "14–27 valid observations. Developing baseline; sufficient observations for trend assessment.",
        )
    return (
        "established",
        "28+ valid observations. Statistically robust historical baseline over the 30-day window.",
    )


def detect_persistent_deviation(
    recent_values: List[float],
    baseline: float,
    volatility: float,
    min_consecutive_days: int = 4,
    threshold_percent: float = 8.0,
) -> Dict[str, Any]:
    """
    Check if the most recent observations consistently deviate in the same direction,
    indicating a potential shift in routine rather than an isolated fluctuation.
    """
    if len(recent_values) < min_consecutive_days or abs(baseline) < 1e-6:
        return {
            "detected": False,
            "direction": None,
            "consecutive_days": 0,
            "average_deviation_percent": 0.0,
            "shift_notice": "Readings are within expected individual variation.",
        }

    # Evaluate last N readings
    tail = recent_values[-min_consecutive_days:]
    deviations = [((v - baseline) / abs(baseline)) * 100 for v in tail]

    all_elevated = all(d >= threshold_percent for d in deviations)
    all_depressed = all(d <= -threshold_percent for d in deviations)

    if all_elevated:
        avg_dev = float(np.mean(deviations))
        return {
            "detected": True,
            "direction": "elevated",
            "consecutive_days": min_consecutive_days,
            "average_deviation_percent": round(avg_dev, 2),
            "shift_notice": (
                f"Sustained elevation detected across {min_consecutive_days} consecutive readings "
                f"(average deviation: +{round(avg_dev, 1)}%). This may represent an ongoing physiological "
                "or behavioral routine shift rather than day-to-day noise."
            ),
        }
    elif all_depressed:
        avg_dev = float(np.mean(deviations))
        return {
            "detected": True,
            "direction": "depressed",
            "consecutive_days": min_consecutive_days,
            "average_deviation_percent": round(avg_dev, 2),
            "shift_notice": (
                f"Sustained depression detected across {min_consecutive_days} consecutive readings "
                f"(average deviation: {round(avg_dev, 1)}%). This may represent an ongoing physiological "
                "or behavioral routine shift rather than day-to-day noise."
            ),
        }

    return {
        "detected": False,
        "direction": None,
        "consecutive_days": 0,
        "average_deviation_percent": 0.0,
        "shift_notice": "Readings are within expected individual variation.",
    }


def calculate_baselines(
    df: pd.DataFrame,
    user_id: str,
    window_days: int = 30,
    recency_weight: bool = False,
    half_life_days: float = 14.0,
) -> Dict[str, Any]:
    """
    Calculate personal baselines and freshness telemetry for a user.

    Formulas:
    1. Uniform rolling baseline:
       baseline = mean(x_history)
    2. Recency-weighted baseline (when recency_weight=True):
       w_i = exp(-ln(2) * (t_today - t_i) / half_life)
       baseline = sum(w_i * x_i) / sum(w_i)
    """
    user = df[df["user_id"] == user_id].copy()
    if user.empty:
        raise ValueError(f"User {user_id} not found in dataset")

    # Global dataset reference date (Requirement A.2: do not use host clock)
    all_dates = pd.to_datetime(df["date"])
    reference_dataset_date = all_dates.max()
    reference_date_str = reference_dataset_date.strftime("%Y-%m-%d")

    user["date"] = pd.to_datetime(user["date"])

    # Safe handling: Deduplicate dates by taking the latest/last entry
    user = user.sort_values("date").drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)

    if len(user) == 0:
        raise ValueError(f"No records available for user {user_id}")

    latest_row = user.iloc[-1]
    today = latest_row["date"]
    today_str = today.strftime("%Y-%m-%d")

    # Exclude today's readings to strictly avoid data leakage
    history_window = user[
        (user["date"] < today)
        & (user["date"] >= today - pd.Timedelta(days=window_days))
    ].copy()

    results = {}

    for signal in SIGNALS:
        current_raw = latest_row.get(signal)
        current_valid = is_valid_reading(signal, current_raw)
        current = float(current_raw) if current_valid else None

        # Filter valid historical values
        hist_series = history_window[["date", signal]].copy()
        hist_series["is_valid"] = hist_series[signal].apply(lambda v: is_valid_reading(signal, v))

        valid_hist = hist_series[hist_series["is_valid"]].copy()
        valid_count = len(valid_hist)
        missing_or_invalid_count = len(hist_series) - valid_count

        status_key, status_desc = get_baseline_status(valid_count)

        # Observation freshness relative to dataset reference date
        if current_valid:
            latest_obs_date = today
            age_days = (reference_dataset_date - today).days
        else:
            if valid_count > 0:
                latest_obs_date = valid_hist["date"].max()
                age_days = (reference_dataset_date - latest_obs_date).days
            else:
                latest_obs_date = None
                age_days = None

        if valid_count < 7:
            # Insufficient history for a reliable baseline
            results[signal] = {
                "current": round(current, 2) if current is not None else None,
                "baseline": None,
                "deviation_percent": None,
                "trend": "insufficient_data",
                "trend_change": 0.0,
                "volatility": 0.0,
                "history_days": valid_count,
                "valid_observations": valid_count,
                "missing_or_invalid_count": missing_or_invalid_count,
                "baseline_window_days": window_days,
                "baseline_status": status_key,
                "status_description": status_desc,
                "latest_observation_date": latest_obs_date.strftime("%Y-%m-%d") if latest_obs_date else None,
                "age_days": age_days,
                "persistent_deviation": {
                    "detected": False,
                    "direction": None,
                    "consecutive_days": 0,
                    "average_deviation_percent": 0.0,
                    "shift_notice": "Insufficient data to evaluate baseline shift.",
                },
            }
            continue

        values = valid_hist[signal].astype(float).values
        dates = valid_hist["date"].values

        # Baseline calculation
        if recency_weight and len(values) > 1:
            delta_days = (today - valid_hist["date"]).dt.total_seconds() / 86400.0
            decay_lambda = math.log(2) / max(half_life_days, 1.0)
            weights = np.exp(-decay_lambda * delta_days.values)
            sum_weights = np.sum(weights)
            baseline = float(np.sum(weights * values) / sum_weights) if sum_weights > 0 else float(np.mean(values))
        else:
            baseline = float(np.mean(values))

        volatility = float(np.std(values, ddof=0))

        # Safe deviation calculation (handles zero baseline)
        if current is not None:
            if abs(baseline) > 1e-6:
                deviation = ((current - baseline) / abs(baseline)) * 100
            else:
                deviation = 0.0 if abs(current) < 1e-6 else None
        else:
            deviation = None

        # Trend calculation: compare last 7 observations with prior 7 observations
        if len(values) >= 14:
            recent_mean = float(np.mean(values[-7:]))
            prior_mean = float(np.mean(values[-14:-7]))
            trend_change = recent_mean - prior_mean
        else:
            trend_change = float(values[-1] - values[0])

        threshold = max(volatility * 0.1, 0.001)
        if trend_change > threshold:
            trend = "increasing"
        elif trend_change < -threshold:
            trend = "decreasing"
        else:
            trend = "stable"

        # Persistent deviation / baseline shift detection
        shift_telemetry = detect_persistent_deviation(
            recent_values=list(values),
            baseline=baseline,
            volatility=volatility,
            min_consecutive_days=4,
            threshold_percent=8.0,
        )

        results[signal] = {
            "current": round(current, 2) if current is not None else None,
            "baseline": round(baseline, 2),
            "deviation_percent": round(deviation, 2) if deviation is not None else None,
            "trend": trend,
            "trend_change": round(trend_change, 2),
            "volatility": round(volatility, 2),
            "history_days": valid_count,
            "valid_observations": valid_count,
            "missing_or_invalid_count": missing_or_invalid_count,
            "baseline_window_days": window_days,
            "baseline_status": status_key,
            "status_description": status_desc,
            "latest_observation_date": latest_obs_date.strftime("%Y-%m-%d") if latest_obs_date else None,
            "age_days": age_days,
            "persistent_deviation": shift_telemetry,
        }

    return {
        "user_id": user_id,
        "date": today_str,
        "dataset_reference_date": reference_date_str,
        "freshness_reference_note": (
            f"Observation freshness is calculated relative to dataset reference date {reference_date_str}, "
            "not host machine clock time. All data is historical demo data."
        ),
        "baseline_window_days": window_days,
        "baseline_formula": (
            "exponential_recency_weighted_mean" if recency_weight else "uniform_rolling_mean"
        ),
        "signals": results,
        "disclaimer": (
            "Adaptive statistical baseline for research simulation. "
            "Not a clinically validated norm or medical diagnostic standard."
        ),
    }
