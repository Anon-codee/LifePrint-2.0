"""
Condition Domain Service for LifePrint 3.0.

Defines condition metadata, signal/outcome prioritization, and disclaimer contracts.
Supports multi-condition digital twin switching (e.g. Cardiovascular vs. Migraine tracking).
This is a research prototype based on synthetic data and does not provide clinical diagnoses.
"""

from typing import Any, Dict, List, Optional

CONDITIONS: Dict[str, Dict[str, Any]] = {
    "cardiovascular_bp": {
        "id": "cardiovascular_bp",
        "name": "Cardiovascular & Blood Pressure Monitoring",
        "tagline": "Autonomic Stability & Arterial Load",
        "description": (
            "Exploratory longitudinal tracking of blood pressure, resting heart rate, "
            "and lifestyle load factors in synthetic health records."
        ),
        "primary_signals": [
            "systolic_bp",
            "diastolic_bp",
            "resting_hr",
            "activity_steps",
            "stress",
        ],
        "supporting_signals": [
            "heart_rate",
            "sleep_hours",
            "caffeine",
            "recovery",
        ],
        "target_outcomes": [
            "bp_elevation",
        ],
        "exploratory_thresholds": {
            "systolic_bp": {"direction": "above", "percent": 10.0},
            "diastolic_bp": {"direction": "above", "percent": 10.0},
            "resting_hr": {"direction": "above", "percent": 10.0},
            "activity_steps": {"direction": "below", "percent": 20.0},
            "stress": {"direction": "above", "percent": 15.0},
        },
        "default_reference_ranges": {
            "systolic_bp": {"min": 95.0, "max": 130.0, "unit": "mmHg", "label": "Self-selected systolic reference"},
            "diastolic_bp": {"min": 60.0, "max": 85.0, "unit": "mmHg", "label": "Self-selected diastolic reference"},
            "resting_hr": {"min": 50.0, "max": 80.0, "unit": "bpm", "label": "Self-selected resting HR reference"},
        },
        "is_synthetic": True,
        "disclaimer": (
            "Synthetic-data digital twin research prototype. "
            "The synthetic bp_elevation model output is an experimental statistical estimate, "
            "not a clinical hypertension diagnosis or validated cardiovascular risk score. "
            "Reference ranges are self-selected user markers, not medical guidelines."
        ),
    },
    "migraine_headache": {
        "id": "migraine_headache",
        "name": "Migraine & Headache Tracking",
        "tagline": "Sensory Vulnerability & Triggers",
        "description": (
            "Exploratory tracking of sleep regularity, hydration deficits, caffeine fluctuations, "
            "and stress triggers in synthetic health records."
        ),
        "primary_signals": [
            "sleep_hours",
            "stress",
            "caffeine",
            "hydration_liters",
        ],
        "supporting_signals": [
            "sleep_quality",
            "activity_steps",
            "heart_rate",
            "recovery",
        ],
        "target_outcomes": [
            "headache",
        ],
        "exploratory_thresholds": {
            "sleep_hours": {"direction": "below", "percent": 15.0},
            "stress": {"direction": "above", "percent": 20.0},
            "caffeine": {"direction": "above", "percent": 25.0},
            "hydration_liters": {"direction": "below", "percent": 15.0},
        },
        "default_reference_ranges": {
            "sleep_hours": {"min": 6.5, "max": 9.0, "unit": "h", "label": "Self-selected target sleep"},
            "stress": {"min": 0.0, "max": 6.0, "unit": "/10", "label": "Self-selected stress ceiling"},
            "hydration_liters": {"min": 2.0, "max": 3.5, "unit": "L", "label": "Self-selected hydration target"},
        },
        "is_synthetic": True,
        "disclaimer": (
            "Synthetic-data digital twin research prototype. "
            "The synthetic headache prediction is an experimental random forest estimate, "
            "not a neurological diagnosis or validated clinical assessment."
        ),
    },
}

DEFAULT_CONDITION_ID = "cardiovascular_bp"


def get_all_conditions() -> List[Dict[str, Any]]:
    """Return all registered condition definitions."""
    return list(CONDITIONS.values())


def get_condition(condition_id: str) -> Optional[Dict[str, Any]]:
    """Return condition definition by ID, or None if not found."""
    return CONDITIONS.get(condition_id)


def is_valid_condition(condition_id: str) -> bool:
    """Check whether a condition ID is registered."""
    return condition_id in CONDITIONS
