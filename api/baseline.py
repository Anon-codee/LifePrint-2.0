
from fastapi import APIRouter, Depends, HTTPException
from api.dependencies import get_df
from services.baseline import calculate_baselines

router = APIRouter()


@router.get("/{user_id}/baseline")
def get_user_baseline(user_id: str, df=Depends(get_df)):
    try:
        return calculate_baselines(df, user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )