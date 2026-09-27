
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from data.loader import load_health_data
from services.prediction import train_model

from api.health import router as health_router
from api.users import router as users_router
from api.prediction import router as prediction_router
from api.graph import router as graph_router

from api.baseline import router as baseline_router
from api.patterns import router as patterns_router
from api.graph_v2 import router as graph_v2_router
from api.todays_health import router as todays_health_router
from api.what_if_v2 import router as what_if_v2_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.df = load_health_data("data/health_data.csv")
    app.state.model = train_model(app.state.df)

    yield

    app.state.df = None
    app.state.model = None


app = FastAPI(
    title="LifePrint API",
    description="API for the LifePrint Personalized Health Digital Twin",
    version="2.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "https://lifeprint1.onrender.com",
        "https://lifeprint-ui.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register the upgraded endpoints FIRST.
# FastAPI matches duplicate routes in registration order.

app.include_router(
    baseline_router,
    prefix="/api/users",
    tags=["baseline-v2"],
)

app.include_router(
    patterns_router,
    prefix="/api/users",
    tags=["patterns-v2"],
)

app.include_router(
    graph_v2_router,
    prefix="/api/users",
    tags=["graph-v2"],
)

app.include_router(
    todays_health_router,
    prefix="/api/users",
    tags=["today-v2"],
)

app.include_router(
    what_if_v2_router,
    prefix="/api/users",
    tags=["what-if-v2"],
)


# Register existing endpoints afterward.

app.include_router(
    health_router,
    prefix="/api",
    tags=["health"],
)

app.include_router(
    users_router,
    prefix="/api/users",
    tags=["users"],
)

app.include_router(
    prediction_router,
    prefix="/api/users",
    tags=["prediction"],
)

app.include_router(
    graph_router,
    prefix="/api/users",
    tags=["graph"],
)