from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health_check():
    """
    Basic health check for deployment.
    """
    return {
        "status": "ok",
        "service": "LifePrint API"
    }
