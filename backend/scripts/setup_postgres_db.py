import asyncio
import asyncpg

async def setup():
    print("[INFO] Testing connection to PostgreSQL on localhost:5432...")
    conn = None
    for url in [
        "postgresql://postgres@127.0.0.1:5432/postgres",
        "postgresql://postgres:postgres@127.0.0.1:5432/postgres",
        "postgresql://postgres:postgrespassword2026@127.0.0.1:5432/postgres",
        "postgresql://postgres:123456@127.0.0.1:5432/postgres"
    ]:
        try:
            conn = await asyncpg.connect(url)
            print(f"[OK] Connected to PostgreSQL with URL: {url}")
            break
        except Exception:
            pass

    if not conn:
        print("[ERROR] Could not connect to PostgreSQL. Please verify PostgreSQL service is running.")
        return False

    try:
        print("[INFO] Updating password for user 'postgres' to 'postgres'...")
        await conn.execute("ALTER USER postgres WITH PASSWORD 'postgres';")
        print("[OK] Password updated to 'postgres'")
    except Exception as e:
        print(f"[WARN] Could not alter password: {e}")

    try:
        res = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname='duck_farm_db'")
        if not res:
            print("[INFO] Creating database 'duck_farm_db'...")
            await conn.execute("CREATE DATABASE duck_farm_db;")
            print("[OK] Database 'duck_farm_db' created successfully.")
        else:
            print("[OK] Database 'duck_farm_db' already exists.")
    except Exception as e:
        print(f"[WARN] Database operation note: {e}")

    await conn.close()
    return True

if __name__ == "__main__":
    asyncio.run(setup())
