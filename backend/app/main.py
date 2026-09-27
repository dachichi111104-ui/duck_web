import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.router import api_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("duckcare.main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing DuckCare AI database schema...")
    await init_db()
    logger.info("Database schema initialized.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="API hệ thống quản lý & nhận diện AI dự đoán bệnh qua hành vi gia cầm (Vịt trời)",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)
# Fallback router without /api/v1 prefix for Desktop App / Legacy requests
app.include_router(api_router, prefix="")

@app.get("/")
async def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

