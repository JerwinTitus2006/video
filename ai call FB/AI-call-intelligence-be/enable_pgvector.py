"""Enable pgvector extension on Supabase."""

import asyncio
import asyncpg


async def enable_pgvector():
    """Enable pgvector extension."""
    conn = await asyncpg.connect(
        "postgresql://postgres:sombutooki%40123@db.mpzcobkmxogmphqxypzi.supabase.co:5432/postgres"
    )
    
    try:
        # Enable pgvector extension
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector;")
        print("✓ pgvector extension enabled successfully!")
        
        # Verify
        result = await conn.fetchval(
            "SELECT EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'vector');"
        )
        print(f"✓ pgvector is installed: {result}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(enable_pgvector())
