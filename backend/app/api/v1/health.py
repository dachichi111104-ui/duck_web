from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
from app.core.database import get_db, parse_db_target
from app.core.config import settings

router = APIRouter()

@router.get("", summary="Kiểm tra trạng thái hệ thống & kết nối Database")
@router.get("/", summary="Kiểm tra trạng thái hệ thống & kết nối Database")
@router.get("/health", summary="Kiểm tra trạng thái hệ thống & kết nối Database")
@router.get("/health/", summary="Kiểm tra trạng thái hệ thống & kết nối Database")
async def health_check(db: AsyncSession = Depends(get_db)):
    is_sqlite = settings.USE_SQLITE or "sqlite" in settings.DATABASE_URL
    engine_name = "sqlite" if is_sqlite else "postgresql"
    
    if is_sqlite:
        db_host = "local_file"
        db_name = "duck_farm.db"
    else:
        db_host, db_name = parse_db_target(settings.DATABASE_URL)

    connection_status = "connected"
    server_time = None
    try:
        if is_sqlite:
            res = await db.execute(text("SELECT datetime('now')"))
        else:
            res = await db.execute(text("SELECT NOW()"))
        raw_val = res.scalar()
        server_time = str(raw_val) if raw_val is not None else datetime.utcnow().isoformat()
    except Exception as e:
        connection_status = "error"
        server_time = f"Lỗi query: {str(e)}"

    return {
        "status": "healthy" if connection_status == "connected" else "degraded",
        "database_engine": engine_name,
        "database_host": db_host,
        "database_name": db_name,
        "connection_status": connection_status,
        "server_time": server_time
    }
