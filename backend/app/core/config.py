import os
import re
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()

def sanitize_db_url(url: str) -> str:
    """Auto-correct connection string for asyncpg driver & SSL parameters."""
    if not url:
        return url

    # Remove unsupported query parameters for asyncpg (e.g. channel_binding)
    if "channel_binding=" in url:
        url = re.sub(r'[&?]channel_binding=[^&]+', '', url)

    # Replace sslmode= with ssl= for asyncpg driver compatibility
    if "sslmode=" in url:
        url = url.replace("sslmode=", "ssl=")

    # Ensure asyncpg driver prefix (postgresql+asyncpg://)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    return url

class Settings(BaseSettings):
    PROJECT_NAME: str = "DuckCare AI - Hệ thống Quản lý & Giám sát Vịt trời"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "duckcare_ai_super_secret_jwt_key_2026_nckh_pro_key")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"

    # Database URL configuration directly from environment
    DATABASE_URL: str = sanitize_db_url(
        os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/duck_farm_db")
    )

    # SQLite fallback path for local dev when explicitly requested via USE_SQLITE=true
    SQLITE_URL: str = "sqlite+aiosqlite:///./duck_farm.db"
    USE_SQLITE: bool = os.getenv("USE_SQLITE", "false").lower() in ("true", "1", "yes")

    class Config:
        case_sensitive = True

settings = Settings()
