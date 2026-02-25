"""Jitsi Webhook handler router.

Handles two classes of incoming webhooks:
1.  Legacy recording webhook  (POST /webhooks/jitsi/recording)
    – sent by external Jitsi recording tooling with a finished recording URL.

2.  Prosody conference lifecycle events  (POST /webhooks/jitsi/event)
    – sent by mod_conference_webhook.lua for:
        conference-started  → auto-create a Meeting record
        conference-ended    → stamp ended_at, trigger AI pipeline
        participant-joined  → log participant
        participant-left    → log participant departure
"""

import hashlib
import hmac
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.meeting import Meeting

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])
logger = logging.getLogger(__name__)
settings = get_settings()


# ══════════════════════════════════════════════════════════════════════════════
# Shared secret verification helper
# ══════════════════════════════════════════════════════════════════════════════

def _verify_secret(request_secret: Optional[str]) -> None:
    """Reject the request if the shared secret doesn't match (when configured)."""
    expected = settings.JITSI_WEBHOOK_SECRET
    if not expected:
        return  # No secret configured → accept all
    if not request_secret or not hmac.compare_digest(expected, request_secret):
        raise HTTPException(status_code=401, detail="Invalid webhook secret")


# ══════════════════════════════════════════════════════════════════════════════
# ── 1.  Legacy recording webhook ─────────────────────────────────────────────
# ══════════════════════════════════════════════════════════════════════════════

class JitsiRecordingWebhook(BaseModel):
    """Payload received from Jitsi when a recording completes."""
    room_id: str
    room_name: str = ""
    recording_url: str
    duration: float = 0.0
    participants: list[str] = []
    started_at: str | None = None
    ended_at: str | None = None


async def _process_recording(meeting_id: str, audio_path: str):
    """
    Full async pipeline using AI APIs:
    1. Transcribe audio with speaker diarization (Deepgram/OpenAI)
    2. Extract pain points (OpenAI GPT)
    3. Analyze sentiment (OpenAI GPT)
    4. Generate solutions for pain points (OpenAI GPT)
    5. Generate action items (OpenAI GPT)
    6. Generate meeting summary (OpenAI GPT)
    7. Upload recording to Supabase Storage
    """
    from app.services.ai_api_service import ai_service
    from app.services.supabase_storage import storage_service
    from app.models.pain_point import PainPoint
    from app.models.action_item import ActionItem
    from app.models.sentiment import SentimentSegment
    from app.models.solution import Solution
    from app.models.meeting_summary import MeetingSummary
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as db:
        try:
            meeting = (await db.execute(
                select(Meeting).where(Meeting.id == uuid.UUID(meeting_id))
            )).scalar_one()

            meeting.status = "processing"
            await db.commit()

            # Step 1: Transcribe with AI API (Deepgram/OpenAI)
            logger.info(f"[{meeting_id}] Starting transcription...")
            transcript_result = await ai_service.transcribe_audio(audio_path)
            
            full_text = transcript_result.get("full_text", "")
            segments = transcript_result.get("segments", [])
            
            meeting.transcript = full_text
            await db.commit()
            logger.info(f"[{meeting_id}] Transcription complete: {len(segments)} segments")

            # Step 2: Extract pain points using GPT
            logger.info(f"[{meeting_id}] Extracting pain points...")
            pain_points_data = await ai_service.extract_pain_points(full_text, segments)
            
            pain_point_ids = []
            for pp in pain_points_data:
                pain_point = PainPoint(
                    meeting_id=uuid.UUID(meeting_id),
                    text=pp.get("text", ""),
                    label=pp.get("label", "PROBLEM"),
                    status="open",
                )
                db.add(pain_point)
                await db.flush()
                pain_point_ids.append(pain_point.id)
            
            await db.commit()
            logger.info(f"[{meeting_id}] Extracted {len(pain_points_data)} pain points")

            # Step 3: Analyze sentiment using GPT
            logger.info(f"[{meeting_id}] Analyzing sentiment...")
            sentiment_result = await ai_service.analyze_sentiment(full_text, segments)
            
            for seg in sentiment_result.get("segments", []):
                sentiment_segment = SentimentSegment(
                    meeting_id=uuid.UUID(meeting_id),
                    text=seg.get("text", ""),
                    score=seg.get("score", 0.0),
                )
                db.add(sentiment_segment)
            
            await db.commit()
            logger.info(f"[{meeting_id}] Sentiment analysis complete")

            # Step 4: Generate solutions for pain points
            logger.info(f"[{meeting_id}] Generating solutions...")
            solutions_data = await ai_service.generate_solutions(pain_points_data, full_text)
            
            for sol_group in solutions_data:
                pain_text = sol_group.get("pain_point_text", "")
                for sol in sol_group.get("solutions", []):
                    # Find matching pain point
                    matching_pp = None
                    for pp_id, pp_data in zip(pain_point_ids, pain_points_data):
                        if pp_data.get("text", "") == pain_text or pain_text in pp_data.get("text", ""):
                            matching_pp = pp_id
                            break
                    
                    if matching_pp:
                        solution = Solution(
                            pain_point_id=matching_pp,
                            meeting_id=uuid.UUID(meeting_id),
                            title=sol.get("title", ""),
                            description=sol.get("description", ""),
                            priority=sol.get("priority", "medium"),
                            effort=sol.get("effort", "medium"),
                            expected_outcome=sol.get("expected_outcome", ""),
                        )
                        db.add(solution)
            
            await db.commit()
            logger.info(f"[{meeting_id}] Solutions generated")

            # Step 5: Generate action items
            logger.info(f"[{meeting_id}] Generating action items...")
            actions_data = await ai_service.generate_action_items(full_text, pain_points_data)
            
            for action in actions_data:
                action_item = ActionItem(
                    meeting_id=uuid.UUID(meeting_id),
                    description=action.get("description", ""),
                    owner=action.get("owner", "TBD"),
                    status="pending",
                )
                # Parse due date if provided
                due_date_str = action.get("due_date", "")
                if due_date_str:
                    try:
                        from datetime import date
                        action_item.due_date = date.fromisoformat(due_date_str)
                    except ValueError:
                        pass
                
                db.add(action_item)
            
            await db.commit()
            logger.info(f"[{meeting_id}] Generated {len(actions_data)} action items")

            # Step 6: Generate meeting summary
            logger.info(f"[{meeting_id}] Generating meeting summary...")
            summary_data = await ai_service.generate_meeting_summary(
                full_text, pain_points_data, actions_data, sentiment_result
            )
            
            meeting_summary = MeetingSummary(
                meeting_id=uuid.UUID(meeting_id),
                title=summary_data.get("title"),
                executive_summary=summary_data.get("executive_summary"),
                key_points=summary_data.get("key_points", []),
                decisions_made=summary_data.get("decisions_made", []),
                topics_discussed=summary_data.get("topics_discussed", []),
                next_steps=summary_data.get("next_steps", []),
                participants_summary=summary_data.get("participants_summary", {}),
            )
            db.add(meeting_summary)
            await db.commit()
            logger.info(f"[{meeting_id}] Meeting summary generated")

            # Step 7: Upload recording to Supabase Storage
            logger.info(f"[{meeting_id}] Uploading recording to Supabase...")
            try:
                recording_url = await storage_service.upload_recording(meeting_id, audio_path)
                if recording_url:
                    meeting.recording_url = recording_url
                    logger.info(f"[{meeting_id}] Recording uploaded: {recording_url}")
            except Exception as e:
                logger.warning(f"[{meeting_id}] Failed to upload recording: {e}")

            # Mark as completed
            meeting.status = "completed"
            await db.commit()
            logger.info(f"[{meeting_id}] Processing complete!")

        except Exception as e:
            logger.error(f"[{meeting_id}] Processing failed: {e}")
            meeting.status = "failed"
            await db.commit()
            raise e


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


# ══════════════════════════════════════════════════════════════════════════════
# ── 2.  Prosody conference lifecycle webhooks ─────────────────────────────────
#
#  mod_conference_webhook.lua sends four event types to:
#    POST /webhooks/jitsi/event/{event_type}
#  e.g. /webhooks/jitsi/event/conference-started
# ══════════════════════════════════════════════════════════════════════════════

class ConferenceStartedPayload(BaseModel):
    room_jid: str
    meeting_id: str = ""
    start_time: str = ""


class ConferenceEndedPayload(BaseModel):
    room_jid: str
    end_time: str = ""


class ParticipantPayload(BaseModel):
    room_jid: str
    occupant_jid: str = ""
    display_name: str = ""
    real_jid: str = ""
    join_time: Optional[str] = None
    leave_time: Optional[str] = None


def _room_name_from_jid(room_jid: str) -> str:
    """Extract the local part (before '@') of a MUC JID as the room name."""
    return room_jid.split("@")[0] if "@" in room_jid else room_jid


# ── conference-started ────────────────────────────────────────────────────────

@router.post("/jitsi/event/conference-started", status_code=200)
async def on_conference_started(
    payload: ConferenceStartedPayload,
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """
    Prosody fires this when a MUC room is created (first participant joins).
    Creates a Meeting record so the AI pipeline can attach data to it
    as soon as the meeting begins.
    """
    _verify_secret(x_webhook_secret)

    room_id = payload.meeting_id or _room_name_from_jid(payload.room_jid)
    started_at: Optional[datetime] = None
    if payload.start_time:
        try:
            dt = datetime.fromisoformat(payload.start_time.replace("Z", "+00:00"))
            started_at = dt.replace(tzinfo=None) if dt.tzinfo else dt
        except ValueError:
            started_at = datetime.utcnow()

    # Avoid duplicate records if webhook fires more than once
    existing = (await db.execute(
        select(Meeting).where(Meeting.jitsi_room_id == room_id)
    )).scalar_one_or_none()

    if existing:
        existing.status = "pending"
        if started_at and not existing.started_at:
            existing.started_at = started_at
        await db.commit()
        return {"status": "updated", "meeting_id": str(existing.id)}

    meeting = Meeting(
        jitsi_room_id=room_id,
        title=f"Meeting: {_room_name_from_jid(payload.room_jid)}",
        status="pending",
        started_at=started_at or datetime.utcnow(),
    )
    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)
    await db.commit()

    return {"status": "created", "meeting_id": str(meeting.id)}


# ── conference-ended ──────────────────────────────────────────────────────────

@router.post("/jitsi/event/conference-ended", status_code=200)
async def on_conference_ended(
    payload: ConferenceEndedPayload,
    background_tasks: BackgroundTasks,
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """
    Prosody fires this when the last participant leaves a room.
    Stamps ended_at on the Meeting record and triggers the transcript
    pipeline if an audio file has already been attached (by the transcriber bot).
    """
    _verify_secret(x_webhook_secret)

    room_id = _room_name_from_jid(payload.room_jid)
    ended_at: Optional[datetime] = None
    if payload.end_time:
        try:
            dt = datetime.fromisoformat(payload.end_time.replace("Z", "+00:00"))
            ended_at = dt.replace(tzinfo=None) if dt.tzinfo else dt
        except ValueError:
            ended_at = datetime.utcnow()

    meeting = (await db.execute(
        select(Meeting).where(Meeting.jitsi_room_id == room_id)
    )).scalar_one_or_none()

    if not meeting:
        return {"status": "not_found"}

    meeting.ended_at = ended_at or datetime.utcnow()

    # Only run the pipeline if we already have an audio file
    if meeting.audio_path and meeting.status not in ("completed", "processing"):
        meeting.status = "pending"
        await db.commit()
        background_tasks.add_task(_process_recording, str(meeting.id), meeting.audio_path)
    else:
        await db.commit()

    return {"status": "ended", "meeting_id": str(meeting.id)}


# ── participant-joined ────────────────────────────────────────────────────────

@router.post("/jitsi/event/participant-joined", status_code=200)
async def on_participant_joined(
    payload: ParticipantPayload,
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """
    Log a participant joining.  If the meeting doesn't exist yet (race with
    conference-started) we create it here to be safe.
    """
    _verify_secret(x_webhook_secret)

    room_id = _room_name_from_jid(payload.room_jid)
    meeting = (await db.execute(
        select(Meeting).where(Meeting.jitsi_room_id == room_id)
    )).scalar_one_or_none()

    if not meeting:
        meeting = Meeting(
            jitsi_room_id=room_id,
            title=f"Meeting: {room_id}",
            status="pending",
            started_at=datetime.utcnow(),
        )
        db.add(meeting)
        await db.flush()
        await db.commit()

    return {
        "status": "ok",
        "meeting_id": str(meeting.id),
        "participant": payload.display_name or payload.occupant_jid,
    }


# ── participant-left ──────────────────────────────────────────────────────────

@router.post("/jitsi/event/participant-left", status_code=200)
async def on_participant_left(
    payload: ParticipantPayload,
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """Log a participant leaving (no database changes required – informational)."""
    _verify_secret(x_webhook_secret)
    return {
        "status": "ok",
        "participant": payload.display_name or payload.occupant_jid,
    }


# ── Transcriber-bot audio delivery ───────────────────────────────────────────

class TranscriptDeliveryPayload(BaseModel):
    """Sent by the transcriber bot once it has saved the audio/JSON files."""
    room_jid: str
    audio_path: Optional[str] = None   # path inside the shared /transcripts volume
    transcript_json: Optional[str] = None  # path to final JSON transcript


@router.post("/jitsi/transcript", status_code=200)
async def on_transcript_delivered(
    payload: TranscriptDeliveryPayload,
    background_tasks: BackgroundTasks,
    x_webhook_secret: Optional[str] = Header(None, alias="X-Webhook-Secret"),
    db: AsyncSession = Depends(get_db),
):
    """
    The transcriber bot calls this endpoint once audio recording & initial
    transcription are done.  We attach the paths to the Meeting record and
    (re-)run the full AI pipeline.
    """
    _verify_secret(x_webhook_secret)

    room_id = _room_name_from_jid(payload.room_jid)
    meeting = (await db.execute(
        select(Meeting).where(Meeting.jitsi_room_id == room_id)
    )).scalar_one_or_none()

    if not meeting:
        return {"status": "not_found"}

    if payload.audio_path:
        meeting.audio_path = payload.audio_path
    if payload.transcript_json:
        # Store the path; the pipeline will load & re-process it
        meeting.recording_url = payload.transcript_json

    meeting.status = "pending"
    await db.commit()

    if meeting.audio_path:
        background_tasks.add_task(_process_recording, str(meeting.id), meeting.audio_path)

    return {"status": "accepted", "meeting_id": str(meeting.id)}
