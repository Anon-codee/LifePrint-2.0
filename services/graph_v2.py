
from services.patterns import discover_patterns

SIGNAL_LABELS = {
    "sleep_hours": "Sleep",
    "hydration_liters": "Hydration",
    "stress": "Stress",
    "activity_steps": "Activity",
    "caffeine": "Caffeine",
    "heart_rate": "Heart Rate",
    "resting_hr": "Resting HR",
    "systolic_bp": "Systolic BP",
    "diastolic_bp": "Diastolic BP",
    "sleep_quality": "Sleep Quality",
    "recovery": "Recovery",
}

OUTCOME_LABELS = {
    "headache": "Headache",
    "bp_elevation": "BP Elevation",
    "fatigue": "Fatigue",
    "dehydration_risk": "Dehydration Risk",
    "poor_sleep": "Poor Sleep",
    "stress_overload": "Stress Overload",
    "recovery_deterioration": "Recovery Deterioration",
}


def build_personal_graph(
    df,
    user_id,
    min_difference=10,
    max_edges=20
):
    """
    Build a user-specific graph from discovered
    next-day associations.

    Graph edges represent observed associations,
    NOT proven causal relationships.
    """
    discovery = discover_patterns(df, user_id)

    # Keep stronger observed differences.
    candidates = [
        p for p in discovery["patterns"]
        if abs(p["difference_percentage_points"])
        >= min_difference
    ]

    # Prevent duplicate signal-outcome connections.
    # Retain the direction with the largest difference.
    best_edges = {}

    for pattern in candidates:
        key = (
            pattern["signal"],
            pattern["outcome"]
        )

        existing = best_edges.get(key)

        if (
            existing is None
            or abs(pattern["difference_percentage_points"])
            > abs(existing["difference_percentage_points"])
        ):
            best_edges[key] = pattern

    ranked = sorted(
        best_edges.values(),
        key=lambda p: abs(
            p["difference_percentage_points"]
        ),
        reverse=True
    )[:max_edges]

    nodes = {}
    edges = []

    for pattern in ranked:
        signal = pattern["signal"]
        outcome = pattern["outcome"]

        source_id = f"signal:{signal}"
        target_id = f"outcome:{outcome}"

        nodes[source_id] = {
            "id": source_id,
            "label": SIGNAL_LABELS.get(
                signal, signal
            ),
            "type": "signal",
        }

        nodes[target_id] = {
            "id": target_id,
            "label": OUTCOME_LABELS.get(
                outcome, outcome
            ),
            "type": "outcome",
        }

        difference = pattern[
            "difference_percentage_points"
        ]

        edges.append({
            "id": f"{source_id}:{target_id}",
            "source": source_id,
            "target": target_id,
            "direction": pattern["direction"],
            "relationship": (
                "higher_next_day_event_frequency"
                if difference > 0
                else "lower_next_day_event_frequency"
            ),
            "difference_percentage_points": difference,
            "exposed_event_rate": pattern[
                "event_rate_exposed"
            ],
            "comparison_event_rate": pattern[
                "event_rate_comparison"
            ],
            "observations": (
                pattern["exposed_days"]
                + pattern["comparison_days"]
            ),
            "lag_days": pattern["lag_days"],
        })

    return {
        "user_id": user_id,
        "graph_type": "personal_health_association_graph",
        "description": (
            "Exploratory next-day associations "
            "discovered from synthetic longitudinal data."
        ),
        "nodes": list(nodes.values()),
        "edges": edges,
        "node_count": len(nodes),
        "edge_count": len(edges),
    }