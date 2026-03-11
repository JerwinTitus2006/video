"""
MongoDB connection & GridFS helpers for storing meeting recordings.
Uses Motor (async MongoDB driver) + GridFS for large audio/video files.
"""
import logging
import os
from datetime import datetime
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from dotenv import load_dotenv
from pathlib import Path

# Load .env
_env_path = Path(__file__).parent.parent / ".env"
load_dotenv(_env_path)

logger = logging.getLogger("ai-meet.mongo")

# ── MongoDB connection URL ──
MONGODB_URL = os.getenv(
    "MONGODB_URL",
    "mongodb+srv://hynixtech24_db_user:sombutooki@cluster0.iub9bq5.mongodb.net/",
)
MONGODB_DB_NAME = os.getenv("MONGODB_DB_NAME", "ai_meet")

# Module-level singletons (initialised in init_mongodb)
_client: Optional[AsyncIOMotorClient] = None
_db = None
_fs: Optional[AsyncIOMotorGridFSBucket] = None


async def init_mongodb():
    """Initialise the Motor client, database, and GridFS bucket."""
    global _client, _db, _fs

    try:
        _client = AsyncIOMotorClient(
            MONGODB_URL,
            serverSelectionTimeoutMS=10_000,
            connectTimeoutMS=10_000,
        )
        # Force a connection check
        await _client.admin.command("ping")
        _db = _client[MONGODB_DB_NAME]
        _fs = AsyncIOMotorGridFSBucket(_db, bucket_name="recordings")

        # Create indexes on the meetings_meta collection
        meta = _db["meetings_meta"]
        await meta.create_index("meeting_id", unique=True)
        await meta.create_index("room_code")
        await meta.create_index("created_at")

        logger.info("✅ MongoDB connected  db=%s", MONGODB_DB_NAME)
        return True
    except Exception as exc:
        logger.error("❌ MongoDB connection failed: %s", exc)
        return False


def get_db():
    """Return the Motor database handle."""
    return _db


def get_fs() -> Optional[AsyncIOMotorGridFSBucket]:
    """Return the GridFS bucket for recordings."""
    return _fs


def get_client() -> Optional[AsyncIOMotorClient]:
    """Return the raw Motor client."""
    return _client


# ═══════════════════════════════════════════════════════════════════════════
#  Recording helpers  (GridFS)
# ═══════════════════════════════════════════════════════════════════════════

async def save_recording(
    meeting_id: str,
    room_code: str,
    file_data: bytes,
    filename: str,
    content_type: str = "video/webm",
) -> Optional[str]:
    """
    Store a recording blob in GridFS and save metadata.
    Returns the GridFS file_id as a string, or None on failure.
    """
    if not _fs or not _db:
        logger.error("MongoDB not initialised – cannot save recording")
        return None

    try:
        # Upload to GridFS
        grid_in = _fs.open_upload_stream(
            filename,
            metadata={
                "meeting_id": meeting_id,
                "room_code": room_code,
                "content_type": content_type,
                "uploaded_at": datetime.utcnow().isoformat(),
            },
        )
        await grid_in.write(file_data)
        await grid_in.close()
        file_id = str(grid_in._id)

        # Upsert metadata document
        meta = _db["meetings_meta"]
        await meta.update_one(
            {"meeting_id": meeting_id},
            {
                "$set": {
                    "meeting_id": meeting_id,
                    "room_code": room_code,
                    "recording_file_id": file_id,
                    "recording_filename": filename,
                    "recording_content_type": content_type,
                    "recording_size_bytes": len(file_data),
                    "updated_at": datetime.utcnow(),
                },
                "$setOnInsert": {"created_at": datetime.utcnow()},
            },
            upsert=True,
        )

        logger.info(
            "📼 Recording saved to MongoDB GridFS: %s  (%d KB)  file_id=%s",
            filename,
            len(file_data) // 1024,
            file_id,
        )
        return file_id

    except Exception as exc:
        logger.error("MongoDB save_recording error: %s", exc)
        return None


async def get_recording(meeting_id: str) -> Optional[dict]:
    """
    Retrieve recording bytes + metadata from GridFS by meeting_id.
    Returns dict with keys: data, filename, content_type, size  (or None).
    """
    if not _fs or not _db:
        logger.error("MongoDB not initialised – cannot get recording")
        return None

    try:
        meta = _db["meetings_meta"]
        doc = await meta.find_one({"meeting_id": meeting_id})
        if not doc or "recording_file_id" not in doc:
            return None

        from bson import ObjectId

        file_id = ObjectId(doc["recording_file_id"])
        grid_out = await _fs.open_download_stream(file_id)
        data = await grid_out.read()

        return {
            "data": data,
            "filename": doc.get("recording_filename", f"{meeting_id}.webm"),
            "content_type": doc.get("recording_content_type", "video/webm"),
            "size": len(data),
        }
    except Exception as exc:
        logger.error("MongoDB get_recording error: %s", exc)
        return None


async def delete_recording(meeting_id: str) -> bool:
    """Delete a recording from GridFS by meeting_id."""
    if not _fs or not _db:
        return False

    try:
        from bson import ObjectId

        meta = _db["meetings_meta"]
        doc = await meta.find_one({"meeting_id": meeting_id})
        if not doc or "recording_file_id" not in doc:
            return False

        file_id = ObjectId(doc["recording_file_id"])
        await _fs.delete(file_id)
        await meta.update_one(
            {"meeting_id": meeting_id},
            {"$unset": {"recording_file_id": "", "recording_filename": "", "recording_content_type": "", "recording_size_bytes": ""}},
        )
        logger.info("🗑️ Recording deleted from MongoDB for meeting %s", meeting_id)
        return True
    except Exception as exc:
        logger.error("MongoDB delete_recording error: %s", exc)
        return False


async def save_meeting_metadata(meeting_id: str, room_code: str, **kwargs) -> bool:
    """Persist/update meeting metadata in MongoDB (title, host, participants, etc.)."""
    if not _db:
        return False

    try:
        meta = _db["meetings_meta"]
        update_fields = {
            "meeting_id": meeting_id,
            "room_code": room_code,
            "updated_at": datetime.utcnow(),
            **kwargs,
        }
        await meta.update_one(
            {"meeting_id": meeting_id},
            {"$set": update_fields, "$setOnInsert": {"created_at": datetime.utcnow()}},
            upsert=True,
        )
        return True
    except Exception as exc:
        logger.error("MongoDB save_meeting_metadata error: %s", exc)
        return False


async def list_recordings(limit: int = 50) -> list:
    """List meetings that have recordings stored in MongoDB."""
    if not _db:
        return []

    try:
        meta = _db["meetings_meta"]
        cursor = meta.find(
            {"recording_file_id": {"$exists": True}},
            sort=[("updated_at", -1)],
            limit=limit,
        )
        results = []
        async for doc in cursor:
            results.append({
                "meeting_id": doc["meeting_id"],
                "room_code": doc.get("room_code", ""),
                "filename": doc.get("recording_filename", ""),
                "size_bytes": doc.get("recording_size_bytes", 0),
                "content_type": doc.get("recording_content_type", "video/webm"),
                "created_at": doc.get("created_at", "").isoformat() if doc.get("created_at") else None,
                "updated_at": doc.get("updated_at", "").isoformat() if doc.get("updated_at") else None,
            })
        return results
    except Exception as exc:
        logger.error("MongoDB list_recordings error: %s", exc)
        return []
