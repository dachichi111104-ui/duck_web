import os
import sys
import asyncio
from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add parent dir to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import parse_db_target

async def check_database():
    print("=" * 65)
    print(" DUCKCARE AI - DATABASE CONNECTION & HEALTH CHECK ")
    print("=" * 65)

    is_sqlite = settings.USE_SQLITE or "sqlite" in settings.DATABASE_URL
    engine_type = "SQLite" if is_sqlite else "PostgreSQL"
    
    if is_sqlite:
        db_host, db_name = "local_file", "duck_farm.db"
    else:
        db_host, db_name = parse_db_target(settings.DATABASE_URL)

    print(f"[1] DATABASE ENGINE   : {engine_type}")
    print(f"[2] HOST / ENDPOINT   : {db_host}")
    print(f"[3] DATABASE NAME     : {db_name}")
    print(f"[4] USE_SQLITE SETTING: {settings.USE_SQLITE}")
    print("-" * 65)

    db_url = settings.SQLITE_URL if is_sqlite else settings.DATABASE_URL
    engine_kwargs = {"echo": False}
    if is_sqlite:
        engine_kwargs["connect_args"] = {"check_same_thread": False}

    try:
        engine = create_async_engine(db_url, **engine_kwargs)
        async with engine.connect() as conn:
            # Check server time query
            if is_sqlite:
                time_res = await conn.execute(text("SELECT datetime('now')"))
            else:
                time_res = await conn.execute(text("SELECT NOW()"))
            db_time = time_res.scalar()
            print(f"[STATUS] Connection OK! Database Server Time: {db_time}")

            # Get list of tables
            if is_sqlite:
                tables_res = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"))
                table_names = [r[0] for r in tables_res.all()]
            else:
                tables_res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
                table_names = [r[0] for r in tables_res.all()]

            print("-" * 65)
            print(f"[TABLES INFO] Found {len(table_names)} tables in database:")
            print("-" * 65)

            total_records = 0
            for tbl in sorted(table_names):
                try:
                    count_res = await conn.execute(text(f'SELECT COUNT(*) FROM "{tbl}"'))
                    row_count = count_res.scalar() or 0
                    total_records += row_count
                    print(f"  * Table '{tbl}': {row_count:,} rows")
                except Exception as e:
                    print(f"  * Table '{tbl}': Error counting ({e})")

            print("-" * 65)
            print(f"[SUMMARY] Total Rows Across All Tables: {total_records:,}")
            print("=" * 65)
            print("[RESULT] SUCCESS: Database is fully active and operational!")
            print("=" * 65)
        await engine.dispose()
        return True
    except Exception as e:
        print("\n" + "!" * 65)
        print("[CRITICAL ERROR] COULD NOT CONNECT TO DATABASE!")
        print(f"  Details: {e}")
        print("!" * 65)
        if not is_sqlite:
            print("\n[TROUBLESHOOTING]")
            print("  1. Check connection string DATABASE_URL in backend/.env")
            print("  2. Ensure your cloud database (Neon/Supabase) is active.")
            print("  3. Check internet connection & SSL parameters.\n")
        return False

if __name__ == "__main__":
    load_dotenv()
    success = asyncio.run(check_database())
    sys.exit(0 if success else 1)
