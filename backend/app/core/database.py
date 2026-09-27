import logging
from urllib.parse import urlparse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

logger = logging.getLogger("duckcare.db")

class Base(DeclarativeBase):
    pass

def parse_db_target(url: str):
    """Extract host and database name without exposing passwords."""
    try:
        # Strip driver prefix for urllib parser if present
        clean_url = url.replace("postgresql+asyncpg://", "http://").replace("sqlite+aiosqlite:///", "http://localhost/")
        parsed = urlparse(clean_url)
        host = parsed.hostname or "localhost"
        if parsed.port:
            host = f"{host}:{parsed.port}"
        db_name = parsed.path.lstrip('/') or "duck_farm_db"
        return host, db_name
    except Exception:
        return "cloud_db", "duck_farm_db"

# Determine database connection URL
db_url = settings.DATABASE_URL
if settings.USE_SQLITE:
    db_url = settings.SQLITE_URL
    logger.info("⚡ [DATABASE CONFIG] Đang sử dụng SQLite Async Engine (USE_SQLITE=true)")
else:
    db_host, db_name = parse_db_target(db_url)
    logger.info(f"🐘 [DATABASE CONFIG] Đang kết nối PostgreSQL Cloud tại {db_host}/{db_name}")

engine_kwargs = {"echo": False}
if "sqlite" in db_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

try:
    async_engine = create_async_engine(db_url, **engine_kwargs)
except Exception as e:
    logger.error(f"⚠️ Error creating database engine: {e}")
    async_engine = create_async_engine(settings.SQLITE_URL, echo=False)


AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

async def init_db():
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        if settings.USE_SQLITE:
            logger.info("✅ [DATABASE INIT] Khởi tạo bảng SQLite thành công.")
        else:
            db_host, db_name = parse_db_target(settings.DATABASE_URL)
            logger.info(f"✅ [DATABASE INIT] Khởi tạo toàn bộ bảng trong PostgreSQL ({db_name} @ {db_host}) thành công!")
    except Exception as e:
        if not settings.USE_SQLITE:
            db_host, db_name = parse_db_target(settings.DATABASE_URL)
            err_msg = (
                f"⚠️ [DATABASE INIT WARNING] Chưa kết nối được PostgreSQL tại {db_host}, database={db_name}. "
                f"Chi tiết: {e}"
            )
            logger.error(err_msg)
        else:
            logger.error(f"⚠️ [DATABASE ERROR] Khởi tạo SQLite thất bại: {e}")
