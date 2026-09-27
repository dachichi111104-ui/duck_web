from fastapi import APIRouter
from app.api.v1 import auth, dashboard, barns, flocks, production, inventory, veterinary, ai, reports, users, cameras, notifications, health

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(barns.router, prefix="/barns", tags=["Barns"])
api_router.include_router(flocks.router, prefix="/flocks", tags=["Flocks"])
api_router.include_router(production.router, prefix="/production", tags=["Production"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(veterinary.router, prefix="/veterinary", tags=["Veterinary"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Detection"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["Cameras"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(health.router, prefix="/health", tags=["Health Check"])
