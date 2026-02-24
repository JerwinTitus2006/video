"""Jitsi Webhook handler router."""

import os
import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.meeting import Meeting

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

settings = get_settings()


# --------------- Request Schema ---------------

class JitsiRecordingWebhook(BaseModel):
    """Payload received from Jitsi when a recording completes."""
    room_id: str
    room_name: str = ""
    recording_url: str
    duration: float = 0.0
    participants: list[str] = []
    started_at: str | None = None
    ended_at: str | None = None


# --------------- Background Pipeline ---------------

async def _process_recording(meeting_id: str, audio_path: str):
    """Full async pipeline: transcribe → identify → extract → match → sentiment."""
    from app.services.whisperx_service import process_transcript
    from app.services.speaker_service import identify_speakers_in_meeting
    from app.services.painpoint_service import extract_pain_points
    from app.services.sentiment_service import analyze_meeting_sentiment
    from app.services.resource_service import match_resources_for_meeting
    from app.services.action_service import generate_actions_for_meeting
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            meeting = (await db.execute(
                __import__("sqlalchemy", fromlist=["select"]).select(Meeting).where(Meeting.id == uuid.UUID(meeting_id))
            )).scalar_one()

            meeting.status = "processing"
            await db.commit()

            # Step 1: Transcribe with WhisperX
            transcript_result = await process_transcript(audio_path)

            meeting.transcript = transcript_result.get("full_text", "")
            await db.commit()

            # Step 2: Identify speakers
            await identify_speakers_in_meeting(
                meeting_id=meeting_id,
                segments=transcript_result.get("segments", []),
                db=db,
            )

            # Step 3: Extract pain points
            await extract_pain_points(
                meeting_id=meeting_id,
                segments=transcript_result.get("segments", []),
                db=db,
            )

            # Step 4: Analyze sentiment
            await analyze_meeting_sentiment(
                meeting_id=meeting_id,
                segments=transcript_result.get("segments", []),
                db=db,
            )

            # Step 5: Match resources
            await match_resources_for_meeting(meeting_id=meeting_id, db=db)

            # Step 6: Generate action items
            await generate_actions_for_meeting(meeting_id=meeting_id, db=db)

            meeting.status = "completed"
            await db.commit()

        except Exception as e:
            meeting.status = "failed"
            await db.commit()
            raise e


# --------------- Endpoint ---------------

@router.post("/jitsi/recording")
async def jitsi_recording_webhook(
    payload: JitsiRecordingWebhook,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Receive recording URL + metadata from Jitsi.
    Downloads MP4, creates meeting record, triggers async processing pipeline.
    """
    # 1. Create meeting record
    started = datetime.fromisoformat(payload.started_at) if payload.started_at else None
    ended = datetime.fromisoformat(payload.ended_at) if payload.ended_at else None

    meeting = Meeting(
        jitsi_room_id=payload.room_id,
        title=payload.room_name or f"Meeting {payload.room_id}",
        recording_url=payload.recording_url,
        status="pending",
        started_at=started,
        ended_at=ended,
    )
    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)

    # 2. Download recording to local storage
    storage_dir = os.path.join(settings.STORAGE_PATH, "recordings")
    os.makedirs(storage_dir, exist_ok=True)
    audio_path = os.path.join(storage_dir, f"{meeting.id}.mp4")

    try:
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.get(payload.recording_url)
            resp.raise_for_status()
            with open(audio_path, "wb") as f:
                f.write(resp.content)
    except Exception as e:
        meeting.status = "failed"
        await db.flush()
        raise HTTPException(status_code=502, detail=f"Failed to download recording: {e}")

    meeting.audio_path = audio_path
    await db.flush()

    # 3. Queue full processing pipeline in background
    background_tasks.add_task(_process_recording, str(meeting.id), audio_path)

    return {
        "status": "accepted",
        "meeting_id": str(meeting.id),
        "message": "Recording received. Processing pipeline started.",
    }
