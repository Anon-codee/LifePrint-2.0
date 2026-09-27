from fastapi import APIRouter, Depends
import pandas as pd

from api.dependencies import get_df
from api.users import validate_user
from services.graph import build_health_graph

router = APIRouter()

@router.get("/{user_id}/graph")
async def get_graph(user_id: str, df: pd.DataFrame = Depends(get_df)):
    """
    Return a frontend-friendly JSON representation of the personal health graph.
    """
    user_df = validate_user(df, user_id)
    
    graph = build_health_graph(user_df)
    
    nodes = []
    for node, data in graph.nodes(data=True):
        # build_health_graph uses names like "Sleep", "Hydration" as node names currently.
        # It's better to provide an ID. I will adapt based on what's available.
        nodes.append({
            "id": node,
            "label": node,
            "type": data.get("type", "unknown")
        })
        
    edges = []
    for source, target, data in graph.edges(data=True):
        edges.append({
            "source": source,
            "target": target,
            "strength": round(float(data.get("strength", 0.0)), 3),
            "direction": data.get("direction", "unknown"),
            "feature_id": data.get("feature_id")
        })
        
    return {
        "user_id": user_id,
        "nodes": nodes,
        "edges": edges
    }
