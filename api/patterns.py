
from fastapi import APIRouter, Depends, HTTPException
from api.dependencies import get_df
from services.patterns import discover_patterns

router = APIRouter()


@router.get("/{user_id}/patterns")
def get_user_patterns(user_id: str, df=Depends(get_df)):
    try:
        return discover_patterns(df, user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )