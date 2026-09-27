import networkx as nx
from services.analytics import discover_headache_relationships

def build_health_graph(df):
    """
    Build a Personal Health Graph from the
    relationships discovered from the user's data.
    """
    relationships = discover_headache_relationships(df)
    
    graph = nx.DiGraph()
    target = "Headache"
    graph.add_node(target, type="event")

    names = {
        "sleep_hours": "Sleep",
        "hydration_liters": "Hydration",
        "stress": "Stress",
        "activity_steps": "Activity",
        "caffeine": "Caffeine"
    }

    for relationship in relationships:
        feature = relationship["feature"]
        correlation = relationship["correlation"]
        strength = relationship["strength"]

        readable_name = names.get(feature, feature)
        graph.add_node(readable_name, type="health_factor")

        direction = "negative" if correlation < 0 else "positive"

        graph.add_edge(
            readable_name,
            target,
            strength=strength,
            direction=direction,
            feature_id=feature
        )

    return graph
