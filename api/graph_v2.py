
from fastapi import APIRouter, Depends, HTTPException
from api.dependencies import get_df
from services.graph_v2 import build_personal_graph

router = APIRouter()


@router.get("/{user_id}/graph-v2")
def get_personal_graph(user_id: str, df=Depends(get_df)):
    try:
        return build_personal_graph(df, user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )