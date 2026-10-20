"""
Comprehensive Unit & Integration Test Suite for LifePrint 3.0 Adaptive Digital Twin Intelligence.

Tests:
1. Sparse history (<7 insufficient, 7-13 provisional, 14-27 developing, 28+ established)
2. Missing and invalid observations (filtered out from baseline, counted in telemetry)
3. Duplicate dates (deduplicated cleanly)
4. Zero baseline (division by zero safety)
5. Stale historical data (freshness relative to dataset reference date, not machine clock)
6. Baseline calculation without current-day leakage
7. New observations changing the baseline as expected
8. Persistent deviations being flagged for review
9. Switching conditions changing insight prioritization
"""

from datetime import datetime
import pandas as pd
import numpy as np

from data.loader import load_health_data
from services.baseline import (
    calculate_baselines,
    get_baseline_status,
    is_valid_reading,
    detect_persistent_deviation,
    SIGNALS,
)
from services.twin_status import build_twin_status
from services.profile_store import update_user_profile, get_user_profile


def test_sparse_history():
    print("Testing sparse history thresholds...")
    # Status levels: <7 insufficient, 7-13 provisional, 14-27 developing, 28+ established
    assert get_baseline_status(3)[0] == "insufficient"
    assert get_baseline_status(6)[0] == "insufficient"
    assert get_baseline_status(7)[0] == "provisional"
    assert get_baseline_status(13)[0] == "provisional"
    assert get_baseline_status(14)[0] == "developing"
    assert get_baseline_status(27)[0] == "developing"
    assert get_baseline_status(28)[0] == "established"
    assert get_baseline_status(35)[0] == "established"
    print("  -> Sparse history thresholds passed.")


def test_missing_and_invalid_observations(base_df):
    print("Testing missing and invalid observations handling...")
    user_records = base_df[base_df["user_id"] == "U001"].copy()
    user_records["date"] = pd.to_datetime(user_records["date"])
    user_records = user_records.sort_values("date").reset_index(drop=True)

    # Corrupt 3 historical rows with invalid values: NaN, negative sleep, impossible BP
    user_records.loc[140, "sleep_hours"] = -5.0   # Non-physical
    user_records.loc[141, "sleep_hours"] = np.nan # Missing
    user_records.loc[142, "systolic_bp"] = 999.0  # Impossible BP

    res = calculate_baselines(user_records, "U001")
    sleep_meta = res["signals"]["sleep_hours"]
    assert sleep_meta["missing_or_invalid_count"] >= 2, "Expected at least 2 missing/invalid sleep readings"
    assert sleep_meta["baseline"] > 0, "Baseline should still compute from valid readings"

    bp_meta = res["signals"]["systolic_bp"]
    assert bp_meta["missing_or_invalid_count"] >= 1, "Expected at least 1 invalid BP reading"
    assert bp_meta["baseline"] < 200, "Impossible BP 999.0 must be excluded from baseline"
    print("  -> Missing and invalid observations filtered successfully.")


def test_duplicate_dates(base_df):
    print("Testing duplicate date deduplication...")
    user_records = base_df[base_df["user_id"] == "U001"].copy()
    # Duplicate the latest 3 rows
    dupes = user_records.iloc[-3:].copy()
    combined = pd.concat([user_records, dupes], ignore_index=True)

    res = calculate_baselines(combined, "U001")
    assert res["user_id"] == "U001"
    assert "systolic_bp" in res["signals"]
    assert res["signals"]["systolic_bp"]["baseline"] is not None
    print("  -> Duplicate dates deduplicated cleanly without errors.")


def test_zero_baseline():
    print("Testing zero-valued baseline safety...")
    dates = pd.date_range("2026-08-01", periods=20, freq="D")
    df_zero = pd.DataFrame({
        "user_id": ["U_ZERO"] * 20,
        "date": dates,
        "caffeine": [0.0] * 20,
    })
    # Fill remaining required signals with valid numbers
    for sig in SIGNALS:
        if sig != "caffeine":
            df_zero[sig] = 10.0

    res = calculate_baselines(df_zero, "U_ZERO")
    caff_meta = res["signals"]["caffeine"]
    assert caff_meta["baseline"] == 0.0
    # Zero baseline with zero current should be 0.0 deviation, not ZeroDivisionError
    assert caff_meta["deviation_percent"] == 0.0
    print("  -> Zero-valued baseline handled safely without ZeroDivisionError.")


def test_stale_historical_data(base_df):
    print("Testing data freshness relative to dataset reference date...")
    res = calculate_baselines(base_df, "U001")
    assert "dataset_reference_date" in res
    assert "freshness_reference_note" in res
    ref_date = res["dataset_reference_date"]
    assert ref_date == "2026-09-19", f"Expected dataset reference date 2026-09-19, got {ref_date}"

    # For U001, latest observation is 2026-09-19, so age relative to dataset reference date should be 0
    systolic = res["signals"]["systolic_bp"]
    assert systolic["age_days"] == 0, f"Expected age_days == 0, got {systolic['age_days']}"
    assert systolic["latest_observation_date"] == "2026-09-19"
    print("  -> Freshness properly evaluated relative to dataset reference date.")


def test_no_data_leakage(base_df):
    print("Testing current-day data leakage exclusion...")
    user_df = base_df[base_df["user_id"] == "U001"].copy()
    user_df["date"] = pd.to_datetime(user_df["date"])
    user_df = user_df.sort_values("date").reset_index(drop=True)

    # 1. Baseline with normal latest value
    res1 = calculate_baselines(user_df, "U001")
    baseline1 = res1["signals"]["systolic_bp"]["baseline"]

    # 2. Modify today's (latest row's) systolic BP to an extreme value (e.g. 195.0)
    user_df_mod = user_df.copy()
    user_df_mod.loc[user_df_mod.index[-1], "systolic_bp"] = 195.0

    res2 = calculate_baselines(user_df_mod, "U001")
    baseline2 = res2["signals"]["systolic_bp"]["baseline"]

    # The historical baseline must be 100% IDENTICAL because today's reading must be excluded!
    assert baseline1 == baseline2, f"Data leakage detected! Baseline changed from {baseline1} to {baseline2}"
    assert res2["signals"]["systolic_bp"]["current"] == 195.0
    print("  -> Confirmed: today's reading is strictly excluded from historical baseline (no data leakage).")


def test_new_observations_change_baseline(base_df):
    print("Testing that new observations adapt the baseline...")
    user_df = base_df[base_df["user_id"] == "U001"].copy()
    user_df["date"] = pd.to_datetime(user_df["date"])
    user_df = user_df.sort_values("date").reset_index(drop=True)

    # Baseline before new record
    sub_df = user_df.iloc[:40].copy() # 40 days
    base_early = calculate_baselines(sub_df, "U001")["signals"]["systolic_bp"]["baseline"]

    # Append elevated historical readings
    elevated_slice = user_df.iloc[:50].copy()
    for i in range(40, 49):
        elevated_slice.loc[i, "systolic_bp"] = 145.0 # Well above normal
    base_later = calculate_baselines(elevated_slice, "U001")["signals"]["systolic_bp"]["baseline"]

    assert base_later > base_early, f"Baseline should have adapted upwards, got {base_early} vs {base_later}"
    print("  -> Baseline adapted upward with new historical observations.")


def test_persistent_deviation_flag():
    print("Testing persistent deviation / shift detection...")
    baseline = 100.0
    volatility = 5.0

    # 1. Fluctuating readings (not persistent)
    normal_values = [99.0, 102.0, 98.0, 101.0, 100.0]
    shift_normal = detect_persistent_deviation(normal_values, baseline, volatility)
    assert shift_normal["detected"] is False

    # 2. Four consecutive elevated readings (>8% above 100.0)
    elevated_values = [100.0, 112.0, 115.0, 114.0, 116.0]
    shift_elevated = detect_persistent_deviation(elevated_values, baseline, volatility)
    assert shift_elevated["detected"] is True
    assert shift_elevated["direction"] == "elevated"
    assert shift_elevated["consecutive_days"] == 4
    assert "Sustained elevation detected" in shift_elevated["shift_notice"]

    # 3. Four consecutive depressed readings (<-8% below 100.0)
    depressed_values = [100.0, 88.0, 89.0, 85.0, 87.0]
    shift_depressed = detect_persistent_deviation(depressed_values, baseline, volatility)
    assert shift_depressed["detected"] is True
    assert shift_depressed["direction"] == "depressed"
    print("  -> Persistent deviations successfully identified and flagged.")


def test_condition_switching_prioritization(base_df):
    print("Testing condition switching insight prioritization...")
    # Set to cardiovascular_bp
    update_user_profile("U001", {"active_condition_id": "cardiovascular_bp"})
    twin_cardio = build_twin_status(base_df, "U001")
    assert twin_cardio["condition"]["id"] == "cardiovascular_bp"
    cardio_signals = [s["signal"] for s in twin_cardio["primary_signals"]]
    assert "systolic_bp" in cardio_signals
    assert "resting_hr" in cardio_signals
    assert twin_cardio["synthetic_model_estimate"]["target"] == "bp_elevation"

    # Switch to migraine_headache
    update_user_profile("U001", {"active_condition_id": "migraine_headache"})
    twin_migraine = build_twin_status(base_df, "U001")
    assert twin_migraine["condition"]["id"] == "migraine_headache"
    migraine_signals = [s["signal"] for s in twin_migraine["primary_signals"]]
    assert "sleep_hours" in migraine_signals
    assert "caffeine" in migraine_signals
    assert twin_migraine["synthetic_model_estimate"]["target"] == "headache"

    # Verify insights adapted to the new condition
    insights = twin_migraine["condition_insights"]["insights"]
    assert len(insights) > 0
    # Model prediction insight should target headache now
    pred_insight = next(i for i in insights if i["insight_type"] == "model_prediction")
    assert "Headache" in pred_insight["title"]

    # Restore default
    update_user_profile("U001", {"active_condition_id": "cardiovascular_bp"})
    print("  -> Condition switching dynamically adapted signals, targets, and insights.")


def run_all_tests():
    print("==================================================")
    print("Starting Adaptive Digital Twin Test Suite...")
    print("==================================================")
    base_df = load_health_data("data/health_data.csv")

    test_sparse_history()
    test_missing_and_invalid_observations(base_df)
    test_duplicate_dates(base_df)
    test_zero_baseline()
    test_stale_historical_data(base_df)
    test_no_data_leakage(base_df)
    test_new_observations_change_baseline(base_df)
    test_persistent_deviation_flag()
    test_condition_switching_prioritization(base_df)

    print("==================================================")
    print("All Adaptive Digital Twin tests passed successfully!")
    print("==================================================")


if __name__ == "__main__":
    run_all_tests()
