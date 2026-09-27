
from fastapi import APIRouter, Depends, HTTPException

from api.dependencies import get_df
from services.todays_health import get_todays_health

router = APIRouter()


@router.get("/{user_id}/today-v2")
def get_today(user_id: str, df=Depends(get_df)):
    try:
        return get_todays_health(df, user_id)
    except ValueError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error)
        )