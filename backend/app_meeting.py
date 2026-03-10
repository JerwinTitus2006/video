"""
AI Meet – Call Intelligence Platform
WebRTC signaling via Socket.IO  +  Room management via FastAPI
SQLite local database  +  Sarvam AI transcription  +  NLP insights
"""
import logging
import uuid
import random
import string
import base64
import asyncio
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import socketio
from dotenv import load_dotenv

# Load .env from the backend directory (not CWD)
_env_path = Path(__file__).parent / ".env"
load_dotenv(_env_path)

# Recordings directory
RECORDINGS_DIR = Path(__file__).parent / "data" / "recordings"
RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)

# Database & AI imports
from database.database import init_db, async_session_maker
from database.models import (
    Meeting, Transcript, PainPoint, ActionItem, SentimentAnalysis,
)
from sqlalchemy import select
from services.sarvam_ai import sarvam_service
from services.ai_processor import ai_processor, check_for_pain_points_realtime

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(name)-18s  %(levelname)-7s  %(message)s",
)
logger = logging.getLogger("ai-meet")

# ---------------------------------------------------------------------------
# Socket.IO  (async ASGI mode)
# ---------------------------------------------------------------------------
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    ping_timeout=60,
    ping_interval=25,
    logger=False,
    engineio_logger=False,
)

# ---------------------------------------------------------------------------
# FastAPI
# ---------------------------------------------------------------------------
app = FastAPI(title="AI Meet – Call Intelligence Platform", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve built frontend (production)
dist_path = Path(__file__).parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_path / "assets")), name="assets")

# Combined ASGI application
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# ---------------------------------------------------------------------------
# In-memory room state  (+ meeting_id links each room to the DB)
# ---------------------------------------------------------------------------
rooms: Dict[str, dict] = {}

# Waiting room: room_id -> { sid: { name, audioEnabled, videoEnabled, ... } }
waiting_rooms: Dict[str, dict] = {}


def _room_code() -> str:
    """Generate a Google Meet–style room code: abc-defg-hij"""
    c = string.ascii_lowercase
    while True:
        code = (
            f"{''.join(random.choices(c, k=3))}-"
            f"{''.join(random.choices(c, k=4))}-"
            f"{''.join(random.choices(c, k=3))}"
        )
        if code not in rooms:
            return code


# Pydantic request model for creating meetings
class CreateMeetingRequest(BaseModel):
    title: str = "Untitled Meeting"
    host_name: str = "Host"
    scheduled_at: Optional[str] = None        # ISO datetime string or None for instant
    require_admission: bool = True


async def _room(room_id: str) -> dict:
    """Get or create an in-memory room **and** a matching DB Meeting row."""
    if room_id not in rooms:
        rooms[room_id] = {
            "id": room_id,
            "participants": {},
            "chat": [],
            "meeting_id": None,
            "host_name": None,
            "host_sid": None,
            "require_admission": True,
            "created": datetime.now().isoformat(),
        }
        # Persist to SQLite
        async with async_session_maker() as db:
            try:
                meeting = Meeting(
                    room_code=room_id,
                    title=f"Meeting {room_id}",
                    status="waiting",
                    started_at=None,  # Will be set when host joins
                    participant_count=0,
                )
                db.add(meeting)
                await db.commit()
                await db.refresh(meeting)
                rooms[room_id]["meeting_id"] = meeting.id
                logger.info("📝 Meeting row created: %s", meeting.id)
            except Exception as exc:
                logger.error("DB create meeting error: %s", exc)
                await db.rollback()
    return rooms[room_id]


# ═══════════════════════════════════════════════════════════════════════════
# REST ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/")
async def index():
    for candidate in [
        dist_path / "index.html",
        Path(__file__).parent.parent / "frontend" / "index.html",
    ]:
        if candidate.exists():
            return FileResponse(str(candidate))
    return {"message": "AI Meet – Call Intelligence Platform", "docs": "/docs"}


@app.get("/api/health")
async def health():
    return {"status": "healthy", "rooms": len(rooms), "timestamp": datetime.utcnow().isoformat()}


@app.post("/api/rooms")
async def create_room(body: CreateMeetingRequest = None):
    """Create a new meeting room. Accepts optional title, host_name, scheduled_at, require_admission."""
    if body is None:
        body = CreateMeetingRequest()

    rid = _room_code()

    # Parse scheduled_at
    sched_dt = None
    if body.scheduled_at:
        try:
            sched_dt = datetime.fromisoformat(body.scheduled_at.replace("Z", "+00:00"))
        except Exception:
            sched_dt = None

    status = "scheduled" if sched_dt else "waiting"

    # Create in-memory room
    rooms[rid] = {
        "id": rid,
        "participants": {},
        "chat": [],
        "meeting_id": None,
        "host_name": body.host_name,
        "host_sid": None,
        "require_admission": body.require_admission,
        "created": datetime.now().isoformat(),
    }

    # Persist to SQLite
    async with async_session_maker() as db:
        try:
            meeting = Meeting(
                room_code=rid,
                title=body.title or f"Meeting {rid}",
                host_name=body.host_name,
                scheduled_at=sched_dt,
                require_admission=1 if body.require_admission else 0,
                status=status,
                started_at=None,  # Will be set when host joins
                participant_count=0,
            )
            db.add(meeting)
            await db.commit()
            await db.refresh(meeting)
            rooms[rid]["meeting_id"] = meeting.id
            logger.info("📝 Meeting created: %s  code=%s  host=%s", meeting.id, rid, body.host_name)
        except Exception as exc:
            logger.error("DB create meeting error: %s", exc)
            await db.rollback()

    return {
        "roomId": rid,
        "created": rooms[rid]["created"],
        "meetingId": rooms[rid]["meeting_id"],
        "title": body.title,
        "hostName": body.host_name,
        "scheduledAt": body.scheduled_at,
        "requireAdmission": body.require_admission,
    }


@app.get("/api/rooms/{room_id}")
async def get_room(room_id: str):
    # Check in-memory first
    if room_id in rooms:
        room = rooms[room_id]
        return {
            "roomId": room_id,
            "exists": True,
            "participants": len(room["participants"]),
            "meetingId": room.get("meeting_id"),
            "hostName": room.get("host_name"),
            "requireAdmission": room.get("require_admission", True),
        }
    # Check database for scheduled meetings not yet in memory
    async with async_session_maker() as db:
        result = await db.execute(
            select(Meeting).where(Meeting.room_code == room_id)
        )
        meeting = result.scalar_one_or_none()
        if meeting:
            # Re-hydrate into memory
            rooms[room_id] = {
                "id": room_id,
                "participants": {},
                "chat": [],
                "meeting_id": meeting.id,
                "host_name": meeting.host_name,
                "host_sid": None,
                "require_admission": bool(meeting.require_admission),
                "created": meeting.started_at.isoformat() if meeting.started_at else datetime.now().isoformat(),
            }
            return {
                "roomId": room_id,
                "exists": True,
                "participants": 0,
                "meetingId": meeting.id,
                "hostName": meeting.host_name,
                "requireAdmission": bool(meeting.require_admission),
            }
    return {"roomId": room_id, "exists": False, "participants": 0}


@app.post("/api/rooms/{room_id}/admit/{sid}")
async def admit_participant(room_id: str, sid: str):
    """Host admits a participant from the waiting room."""
    wr = waiting_rooms.get(room_id, {})
    if sid not in wr:
        return {"error": "Participant not in waiting room"}
    # Will be handled via socket event
    return {"status": "use socket event admit_participant instead"}


@app.post("/api/rooms/{room_id}/deny/{sid}")
async def deny_participant(room_id: str, sid: str):
    """Host denies a participant from the waiting room."""
    return {"status": "use socket event deny_participant instead"}


# ── Meeting analytics REST endpoints ──────────────────────────────────────

@app.get("/api/meetings")
async def list_meetings(status: Optional[str] = None, limit: int = 50):
    async with async_session_maker() as db:
        q = select(Meeting).order_by(Meeting.started_at.desc()).limit(limit)
        if status:
            q = q.where(Meeting.status == status)
        result = await db.execute(q)
        meetings = result.scalars().all()
        return {
            "meetings": [
                {
                    "id": m.id,
                    "room_code": m.room_code,
                    "title": m.title,
                    "host_name": m.host_name,
                    "scheduled_at": m.scheduled_at.isoformat() if m.scheduled_at else None,
                    "started_at": m.started_at.isoformat() if m.started_at else None,
                    "ended_at": m.ended_at.isoformat() if m.ended_at else None,
                    "status": m.status,
                    "participant_count": m.participant_count,
                    "duration_minutes": m.duration_minutes,
                    "has_recording": bool(m.recording_filename),
                }
                for m in meetings
            ]
        }


@app.get("/api/meetings/{meeting_id}")
async def get_meeting(meeting_id: str):
    async with async_session_maker() as db:
        meeting = await db.get(Meeting, meeting_id)
        if not meeting:
            return {"error": "Meeting not found"}
        return {
            "id": meeting.id,
            "room_code": meeting.room_code,
            "title": meeting.title,
            "started_at": meeting.started_at.isoformat() if meeting.started_at else None,
            "ended_at": meeting.ended_at.isoformat() if meeting.ended_at else None,
            "status": meeting.status,
            "participant_count": meeting.participant_count,
            "duration_minutes": meeting.duration_minutes,
        }


@app.get("/api/meetings/{meeting_id}/transcripts")
async def get_transcripts(meeting_id: str):
    async with async_session_maker() as db:
        result = await db.execute(
            select(Transcript)
            .where(Transcript.meeting_id == meeting_id)
            .order_by(Transcript.created_at)
        )
        transcripts = result.scalars().all()
        return {
            "transcripts": [
                {
                    "id": t.id,
                    "speaker_name": t.speaker_name,
                    "text": t.text,
                    "timestamp_seconds": t.timestamp_seconds,
                    "confidence": t.confidence,
                    "created_at": t.created_at.isoformat(),
                }
                for t in transcripts
            ]
        }


@app.get("/api/meetings/{meeting_id}/pain-points")
async def get_pain_points(meeting_id: str):
    async with async_session_maker() as db:
        result = await db.execute(
            select(PainPoint)
            .where(PainPoint.meeting_id == meeting_id)
            .order_by(PainPoint.extracted_at.desc())
        )
        pain_points = result.scalars().all()
        data = []
        for pp in pain_points:
            await db.refresh(pp, ["solutions"])
            data.append({
                "id": pp.id,
                "issue_text": pp.issue_text,
                "category": pp.category,
                "severity": pp.severity,
                "status": pp.status,
                "extracted_at": pp.extracted_at.isoformat(),
                "solutions": [
                    {
                        "id": s.id,
                        "solution_text": s.solution_text,
                        "implementation_steps": s.implementation_steps,
                        "feasibility_score": s.feasibility_score,
                        "estimated_impact": s.estimated_impact,
                    }
                    for s in pp.solutions
                ],
            })
        return {"pain_points": data}


@app.get("/api/meetings/{meeting_id}/action-items")
async def get_action_items(meeting_id: str):
    async with async_session_maker() as db:
        result = await db.execute(
            select(ActionItem)
            .where(ActionItem.meeting_id == meeting_id)
            .order_by(ActionItem.created_at.desc())
        )
        items = result.scalars().all()
        return {
            "action_items": [
                {
                    "id": a.id,
                    "task_description": a.task_description,
                    "assigned_to": a.assigned_to,
                    "priority": a.priority,
                    "status": a.status,
                    "due_date": a.due_date.isoformat() if a.due_date else None,
                    "created_at": a.created_at.isoformat(),
                }
                for a in items
            ]
        }


@app.get("/api/meetings/{meeting_id}/sentiment")
async def get_sentiment(meeting_id: str):
    async with async_session_maker() as db:
        result = await db.execute(
            select(SentimentAnalysis).where(SentimentAnalysis.meeting_id == meeting_id)
        )
        s = result.scalar_one_or_none()
        if not s:
            return {"error": "Sentiment analysis not available yet"}
        return {
            "overall_sentiment": s.overall_sentiment,
            "sentiment_score": s.sentiment_score,
            "distributor_satisfaction": s.distributor_satisfaction,
            "confidence": s.confidence,
            "analyzed_at": s.analyzed_at.isoformat(),
        }


# ── Recording upload & download endpoints ──────────────────────────────────

@app.post("/api/meetings/{meeting_id}/recording")
async def upload_recording(meeting_id: str, file: UploadFile = File(...)):
    """Upload a meeting recording (webm/mp4). Stored on disk, filename saved in DB."""
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "webm"
    filename = f"{meeting_id}.{ext}"
    filepath = RECORDINGS_DIR / filename

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    # Save filename in DB
    async with async_session_maker() as db:
        try:
            meeting = await db.get(Meeting, meeting_id)
            if meeting:
                meeting.recording_filename = filename
                await db.commit()
        except Exception as exc:
            logger.error("DB recording save error: %s", exc)

    logger.info("📼 Recording saved: %s (%d KB)", filename, len(contents) // 1024)
    return {"status": "ok", "filename": filename, "size": len(contents)}


@app.get("/api/meetings/{meeting_id}/recording")
async def download_recording(meeting_id: str):
    """Download / stream a meeting recording."""
    async with async_session_maker() as db:
        meeting = await db.get(Meeting, meeting_id)
        if not meeting or not meeting.recording_filename:
            return {"error": "No recording available"}
        filepath = RECORDINGS_DIR / meeting.recording_filename
        if not filepath.exists():
            return {"error": "Recording file not found"}
        media_type = "video/webm" if meeting.recording_filename.endswith(".webm") else "video/mp4"
        return FileResponse(
            str(filepath),
            media_type=media_type,
            filename=meeting.recording_filename,
        )


# ── Email invitation endpoint ─────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: str
    room_id: str
    host_name: str = "Someone"
    meeting_link: str


@app.post("/api/invite")
async def send_invite(req: InviteRequest):
    """Send an email invitation with a styled JOIN CALL button."""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_email = os.getenv("SMTP_EMAIL", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if not smtp_email or not smtp_password:
        return {"status": "error", "error": "Email not configured. Set SMTP_EMAIL and SMTP_PASSWORD in .env"}

    # Build styled HTML email (Google Meet style)
    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin:0;padding:0;font-family:'Google Sans',Roboto,Arial,sans-serif;background:#f8f9fa;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08);">
        <tr>
          <td style="background:#1a73e8;padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="color:#fff;font-size:22px;font-weight:500;">🎥 AI Meet</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 32px 20px;">
            <h1 style="margin:0 0 8px;font-size:24px;font-weight:400;color:#202124;">
              {req.host_name} has invited you to a meeting
            </h1>
            <p style="margin:0 0 28px;font-size:15px;color:#5f6368;line-height:1.6;">
              Click the button below to join the video call. No download required — it works right in your browser.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px;" align="center">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#1a73e8;border-radius:8px;">
                  <a href="{req.meeting_link}"
                     style="display:inline-block;padding:14px 44px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:500;letter-spacing:.5px;">
                    JOIN CALL
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 12px;">
            <p style="margin:0;font-size:13px;color:#5f6368;">Or join with this link:</p>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 8px;">
            <a href="{req.meeting_link}" style="font-size:14px;color:#1a73e8;word-break:break-all;">
              {req.meeting_link}
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 12px;">
            <p style="margin:0;font-size:13px;color:#5f6368;">Meeting code: <strong>{req.room_id}</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #e0e0e0;">
            <p style="margin:0;font-size:12px;color:#9aa0a6;line-height:1.5;">
              This invitation was sent by AI Meet. If you didn't expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"{req.host_name} has invited you to join AI Meet"
    msg["From"] = smtp_email
    msg["To"] = req.email

    # Plain text fallback
    text_body = (
        f"{req.host_name} has invited you to a meeting.\n\n"
        f"Join here: {req.meeting_link}\n"
        f"Meeting code: {req.room_id}\n"
    )
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _send_email_sync, smtp_host, smtp_port, smtp_email, smtp_password, req.email, msg)
        logger.info("📧 Invite sent to %s for room %s", req.email, req.room_id)
        return {"status": "ok"}
    except Exception as exc:
        logger.error("Email send error: %s", exc)
        return {"status": "error", "error": str(exc)}


def _send_email_sync(host: str, port: int, sender: str, password: str, to: str, msg):
    """Synchronous SMTP send (run in executor)."""
    with smtplib.SMTP(host, port) as server:
        server.starttls()
        server.login(sender, password)
        server.sendmail(sender, to, msg.as_string())


# ═══════════════════════════════════════════════════════════════════════════
# SOCKET.IO – connection lifecycle
# ═══════════════════════════════════════════════════════════════════════════

@sio.event
async def connect(sid, environ):
    logger.info("+ connected  %s", sid)


@sio.event
async def disconnect(sid):
    logger.info("- disconnected %s", sid)
    # Clean up from waiting rooms
    for rid in list(waiting_rooms):
        wr = waiting_rooms.get(rid, {})
        if sid in wr:
            person = wr.pop(sid)
            room = rooms.get(rid)
            if room and room.get("host_sid"):
                await sio.emit("waiting_room_update", {
                    "action": "left",
                    "sid": sid,
                    "name": person.get("name", "?"),
                    "waiting": {k: v for k, v in wr.items()},
                }, to=room["host_sid"])
            if not wr:
                del waiting_rooms[rid]
    # Clean up from rooms
    for rid in list(rooms):
        room = rooms.get(rid)
        if room and sid in room["participants"]:
            p = room["participants"].pop(sid)
            await sio.leave_room(sid, rid)
            await sio.emit(
                "participant_left",
                {"sid": sid, "name": p.get("name", "?")},
                room=rid,
            )
            # Update DB participant count
            mid = room.get("meeting_id")
            if mid:
                async with async_session_maker() as db:
                    try:
                        m = await db.get(Meeting, mid)
                        if m:
                            m.participant_count = len(room["participants"])
                            # If no participants left, mark meeting as ended
                            if not room["participants"] and m.status == "live":
                                m.status = "ended"
                                m.ended_at = datetime.utcnow()
                                if m.started_at:
                                    dur = (m.ended_at - m.started_at).total_seconds() / 60
                                    m.duration_minutes = max(1, round(dur))
                                logger.info("🏁 Meeting %s auto-ended (last participant left)", rid)
                            await db.commit()
                    except Exception:
                        pass
            if not room["participants"]:
                # Keep room alive for 30s so AI processing can finish
                asyncio.get_event_loop().call_later(30, _cleanup_room, rid)
                logger.info("  room %s scheduled for cleanup in 30s", rid)


def _cleanup_room(rid: str):
    """Remove empty room from memory after delay."""
    room = rooms.get(rid)
    if room and not room["participants"]:
        del rooms[rid]
        logger.info("  room %s removed (cleanup)", rid)


# ═══════════════════════════════════════════════════════════════════════════
# SOCKET.IO – room join / leave
# ═══════════════════════════════════════════════════════════════════════════

@sio.event
async def join_room(sid, data):
    rid = data.get("roomId", "")
    name = data.get("userName", "Guest")
    audio = data.get("audioEnabled", True)
    video = data.get("videoEnabled", True)
    is_host = data.get("isHost", False)
    if not rid:
        return await sio.emit("error", {"message": "Room ID required"}, to=sid)

    room = await _room(rid)

    # ── Host joining ──
    if is_host:
        room["host_sid"] = sid
        room["host_name"] = name
        # Update DB
        mid = room.get("meeting_id")
        if mid:
            async with async_session_maker() as db:
                try:
                    m = await db.get(Meeting, mid)
                    if m:
                        m.host_sid = sid
                        m.host_name = name
                        if m.status in ("waiting", "scheduled"):
                            m.status = "live"
                            m.started_at = datetime.utcnow()
                        await db.commit()
                except Exception:
                    pass
        # Directly admit host
        await _admit_to_room(sid, rid, name, audio, video, is_host=True)
        return

    # ── Non-host joining ──
    # If admission is required and there is a host, put in waiting room
    require_admission = room.get("require_admission", True)
    host_sid = room.get("host_sid")

    if require_admission and host_sid:
        # Put in waiting room
        if rid not in waiting_rooms:
            waiting_rooms[rid] = {}
        waiting_rooms[rid][sid] = {
            "name": name,
            "audioEnabled": audio,
            "videoEnabled": video,
        }
        # Notify the participant they are in the waiting room
        await sio.emit("waiting_room", {
            "roomId": rid,
            "message": f"Waiting for the host to let you in...",
        }, to=sid)
        # Notify the host about the waiting participant
        await sio.emit("waiting_room_update", {
            "action": "join",
            "sid": sid,
            "name": name,
            "waiting": {k: v for k, v in waiting_rooms.get(rid, {}).items()},
        }, to=host_sid)
        logger.info("  %s -> waiting room for %s", name, rid)
        return

    # No admission required or no host yet – directly admit
    await _admit_to_room(sid, rid, name, audio, video, is_host=False)


async def _admit_to_room(sid: str, rid: str, name: str, audio: bool, video: bool, is_host: bool = False):
    """Actually add the participant to the room and notify everyone."""
    room = rooms.get(rid)
    if not room:
        return

    room["participants"][sid] = {
        "name": name,
        "audioEnabled": audio,
        "videoEnabled": video,
        "handRaised": False,
        "screenSharing": False,
        "isHost": is_host,
        "joined": datetime.now().isoformat(),
    }
    await sio.enter_room(sid, rid)

    # Update DB participant count + set status to live
    mid = room.get("meeting_id")
    if mid:
        async with async_session_maker() as db:
            try:
                m = await db.get(Meeting, mid)
                if m:
                    m.participant_count = len(room["participants"])
                    if m.status != "live":
                        m.status = "live"
                        m.started_at = datetime.utcnow()
                    await db.commit()
            except Exception:
                pass

    existing = {k: v for k, v in room["participants"].items() if k != sid}
    await sio.emit(
        "room_joined",
        {
            "roomId": rid,
            "participants": existing,
            "chatHistory": room["chat"][-50:],
            "meetingId": room.get("meeting_id"),
            "isHost": is_host,
            "hostSid": room.get("host_sid"),
        },
        to=sid,
    )
    await sio.emit(
        "participant_joined",
        {"sid": sid, "name": name, "audioEnabled": audio, "videoEnabled": video, "isHost": is_host},
        room=rid,
        skip_sid=sid,
    )
    logger.info("  %s joined %s  (%d)%s", name, rid, len(room["participants"]), " [HOST]" if is_host else "")


@sio.event
async def admit_participant(sid, data):
    """Host admits a participant from the waiting room."""
    rid = data.get("roomId", "")
    target_sid = data.get("targetSid", "")
    room = rooms.get(rid)
    if not room:
        return
    # Only host can admit
    if room.get("host_sid") != sid:
        return await sio.emit("error", {"message": "Only the host can admit participants"}, to=sid)

    wr = waiting_rooms.get(rid, {})
    if target_sid not in wr:
        return

    person = wr.pop(target_sid)
    await _admit_to_room(
        target_sid, rid,
        person["name"],
        person.get("audioEnabled", True),
        person.get("videoEnabled", True),
        is_host=False,
    )
    # Notify host with updated waiting room
    await sio.emit("waiting_room_update", {
        "action": "admitted",
        "sid": target_sid,
        "name": person["name"],
        "waiting": {k: v for k, v in wr.items()},
    }, to=sid)
    logger.info("  ✅ Host admitted %s into %s", person["name"], rid)


@sio.event
async def admit_all(sid, data):
    """Host admits all waiting participants."""
    rid = data.get("roomId", "")
    room = rooms.get(rid)
    if not room:
        return
    if room.get("host_sid") != sid:
        return
    wr = waiting_rooms.get(rid, {})
    for target_sid, person in list(wr.items()):
        wr.pop(target_sid)
        await _admit_to_room(
            target_sid, rid,
            person["name"],
            person.get("audioEnabled", True),
            person.get("videoEnabled", True),
            is_host=False,
        )
    await sio.emit("waiting_room_update", {
        "action": "admitted_all",
        "waiting": {},
    }, to=sid)
    logger.info("  ✅ Host admitted all into %s", rid)


@sio.event
async def deny_participant(sid, data):
    """Host denies a participant from the waiting room."""
    rid = data.get("roomId", "")
    target_sid = data.get("targetSid", "")
    room = rooms.get(rid)
    if not room:
        return
    if room.get("host_sid") != sid:
        return await sio.emit("error", {"message": "Only the host can deny participants"}, to=sid)

    wr = waiting_rooms.get(rid, {})
    if target_sid not in wr:
        return
    person = wr.pop(target_sid)
    # Notify the denied participant
    await sio.emit("denied", {"message": "The host has denied your request to join."}, to=target_sid)
    # Notify host
    await sio.emit("waiting_room_update", {
        "action": "denied",
        "sid": target_sid,
        "name": person["name"],
        "waiting": {k: v for k, v in wr.items()},
    }, to=sid)
    logger.info("  ❌ Host denied %s from %s", person["name"], rid)


@sio.event
async def leave_room(sid, data):
    rid = data.get("roomId", "")
    room = rooms.get(rid)
    if room and sid in room["participants"]:
        p = room["participants"].pop(sid)
        await sio.leave_room(sid, rid)
        await sio.emit(
            "participant_left", {"sid": sid, "name": p.get("name", "?")}, room=rid
        )
        # Update DB
        mid = room.get("meeting_id")
        if mid:
            async with async_session_maker() as db:
                try:
                    m = await db.get(Meeting, mid)
                    if m:
                        m.participant_count = len(room["participants"])
                        # If no participants left, mark meeting as ended
                        if not room["participants"] and m.status == "live":
                            m.status = "ended"
                            m.ended_at = datetime.utcnow()
                            if m.started_at:
                                dur = (m.ended_at - m.started_at).total_seconds() / 60
                                m.duration_minutes = max(1, round(dur))
                            logger.info("🏁 Meeting %s auto-ended (last participant left)", rid)
                        await db.commit()
                except Exception:
                    pass
        if not room["participants"]:
            # Don't delete immediately – AI processing may still be running
            asyncio.get_event_loop().call_later(30, _cleanup_room, rid)
            logger.info("  room %s scheduled for cleanup in 30s", rid)


# ═══════════════════════════════════════════════════════════════════════════
# SOCKET.IO – WebRTC signaling (offer / answer / ice)
# ═══════════════════════════════════════════════════════════════════════════

@sio.event
async def offer(sid, data):
    t = data.get("target")
    if t:
        await sio.emit("offer", {"sdp": data.get("sdp"), "sender": sid}, to=t)


@sio.event
async def answer(sid, data):
    t = data.get("target")
    if t:
        await sio.emit("answer", {"sdp": data.get("sdp"), "sender": sid}, to=t)


@sio.event
async def ice_candidate(sid, data):
    t = data.get("target")
    if t:
        await sio.emit(
            "ice_candidate", {"candidate": data.get("candidate"), "sender": sid}, to=t
        )


# ═══════════════════════════════════════════════════════════════════════════
# SOCKET.IO – media state
# ═══════════════════════════════════════════════════════════════════════════

@sio.event
async def toggle_audio(sid, data):
    rid = data.get("roomId")
    en = data.get("enabled")
    if rid in rooms and sid in rooms[rid]["participants"]:
        rooms[rid]["participants"][sid]["audioEnabled"] = en
        await sio.emit(
            "participant_audio_changed", {"sid": sid, "enabled": en}, room=rid, skip_sid=sid
        )


@sio.event
async def toggle_video(sid, data):
    rid = data.get("roomId")
    en = data.get("enabled")
    if rid in rooms and sid in rooms[rid]["participants"]:
        rooms[rid]["participants"][sid]["videoEnabled"] = en
        await sio.emit(
            "participant_video_changed", {"sid": sid, "enabled": en}, room=rid, skip_sid=sid
        )


@sio.event
async def screen_share(sid, data):
    rid = data.get("roomId")
    sharing = data.get("sharing")
    if rid in rooms and sid in rooms[rid]["participants"]:
        rooms[rid]["participants"][sid]["screenSharing"] = sharing
        await sio.emit(
            "screen_share_changed", {"sid": sid, "sharing": sharing}, room=rid, skip_sid=sid
        )


# ═══════════════════════════════════════════════════════════════════════════
# SOCKET.IO – chat
# ═══════════════════════════════════════════════════════════════════════════

@sio.event
async def chat_message(sid, data):
    rid = data.get("roomId")
    msg = (data.get("message") or "").strip()
    if not rid or not msg or rid not in rooms:
        return
    sender = rooms[rid]["participants"].get(sid, {}).get("name", "Unknown")
    entry = {
        "id": str(uuid.uuid4()),
        "sender": sender,
        "senderSid": sid,
        "message": msg[:2000],
        "timestamp": datetime.now().isoformat(),
    }
    rooms[rid]["chat"].append(entry)
    await sio.emit("chat_message", entry, room=rid)


# ═══════════════════════════════════════════════════════════════════════════
# SOCKET.IO – interactions (hand raise, reactions, captions)
# ═══════════════════════════════════════════════════════════════════════════

@sio.event
async def hand_raise(sid, data):
    rid = data.get("roomId")
    raised = data.get("raised", False)
    if rid in rooms and sid in rooms[rid]["participants"]:
        rooms[rid]["participants"][sid]["handRaised"] = raised
        name = rooms[rid]["participants"][sid]["name"]
        await sio.emit(
            "hand_raise_changed", {"sid": sid, "name": name, "raised": raised}, room=rid
        )


@sio.event
async def reaction(sid, data):
    rid = data.get("roomId")
    emoji = data.get("emoji", "")
    if rid in rooms and sid in rooms[rid]["participants"]:
        name = rooms[rid]["participants"][sid]["name"]
        await sio.emit("reaction", {"sid": sid, "name": name, "emoji": emoji}, room=rid)


@sio.event
async def caption(sid, data):
    rid = data.get("roomId")
    text = data.get("text", "")
    is_final = data.get("isFinal", False)
    if rid in rooms and sid in rooms[rid]["participants"]:
        name = rooms[rid]["participants"][sid]["name"]
        await sio.emit(
            "caption",
            {"sid": sid, "name": name, "text": text, "isFinal": is_final},
            room=rid,
        )

        # ── Persist final captions as transcripts in DB ──
        if is_final and text.strip():
            room = rooms[rid]
            mid = room.get("meeting_id")
            if mid:
                async with async_session_maker() as db:
                    try:
                        t = Transcript(
                            meeting_id=mid,
                            speaker_id=sid,
                            speaker_name=name,
                            text=text.strip(),
                            timestamp_seconds=0,
                            confidence=0.85,
                            language="en-US",
                        )
                        db.add(t)
                        await db.commit()
                        await db.refresh(t)

                        # Broadcast structured transcript
                        await sio.emit("new_transcript", {
                            "id": t.id,
                            "speaker": name,
                            "text": text.strip(),
                            "timestamp": 0,
                            "confidence": 0.85,
                        }, room=rid)

                        # Quick pain-point check
                        pp_id = await check_for_pain_points_realtime(
                            text.strip(), mid, t.id, db
                        )
                        if pp_id:
                            await sio.emit("pain_point_detected", {
                                "id": pp_id,
                                "text": text.strip(),
                            }, room=rid)
                    except Exception as exc:
                        logger.error("DB transcript save error: %s", exc)


# ═══════════════════════════════════════════════════════════════════════════
# SOCKET.IO – Sarvam AI audio transcription (optional)
# ═══════════════════════════════════════════════════════════════════════════

@sio.event
async def audio_chunk(sid, data):
    """Receive Base64 audio, transcribe via Sarvam AI, store & broadcast."""
    rid = data.get("room") or data.get("roomId")
    audio_b64 = data.get("audioData")
    speaker_name = data.get("speakerName", "Unknown")
    ts = data.get("timestamp", 0)

    if not rid or not audio_b64:
        return

    room = rooms.get(rid)
    if not room:
        return
    mid = room.get("meeting_id")
    if not mid:
        return

    try:
        audio_bytes = base64.b64decode(audio_b64)
        result = await sarvam_service.transcribe_audio(audio_bytes, language="en-IN")
        if not result or not result["transcript"].strip():
            return

        txt = result["transcript"].strip()
        async with async_session_maker() as db:
            t = Transcript(
                meeting_id=mid,
                speaker_id=sid,
                speaker_name=speaker_name,
                text=txt,
                timestamp_seconds=ts,
                confidence=result["confidence"],
                language=result["language"],
            )
            db.add(t)
            await db.commit()
            await db.refresh(t)

            await sio.emit("new_transcript", {
                "id": t.id,
                "speaker": speaker_name,
                "text": txt,
                "timestamp": ts,
                "confidence": result["confidence"],
            }, room=rid)

            logger.info("📝 [%s] %s…", speaker_name, txt[:50])

            pp_id = await check_for_pain_points_realtime(txt, mid, t.id, db)
            if pp_id:
                await sio.emit("pain_point_detected", {
                    "id": pp_id, "text": txt,
                }, room=rid)

    except Exception as exc:
        logger.error("audio_chunk error: %s", exc)


# ═══════════════════════════════════════════════════════════════════════════
# SOCKET.IO – end meeting & trigger AI processing
# ═══════════════════════════════════════════════════════════════════════════

@sio.event
async def end_meeting(sid, data):
    rid = data.get("roomId") or data.get("room")
    if rid not in rooms:
        return

    room = rooms[rid]
    mid = room.get("meeting_id")

    if mid:
        async with async_session_maker() as db:
            try:
                meeting = await db.get(Meeting, mid)
                if meeting:
                    meeting.status = "ended"
                    meeting.ended_at = datetime.utcnow()
                    if meeting.started_at:
                        dur = (meeting.ended_at - meeting.started_at).total_seconds() / 60
                        meeting.duration_minutes = max(1, round(dur))
                    else:
                        meeting.duration_minutes = 0
                    await db.commit()
                    logger.info("🏁 Meeting %s ended (%d min)", rid, meeting.duration_minutes)
            except Exception as exc:
                logger.error("end_meeting DB error: %s", exc)

        # Background AI processing
        asyncio.create_task(_process_meeting_ai(mid, rid))

    await sio.emit("meeting_ended", {"meetingId": mid}, room=rid)


async def _process_meeting_ai(meeting_id: str, room_code: str):
    """Background task – full NLP pipeline."""
    try:
        await asyncio.sleep(2)  # let final writes settle
        async with async_session_maker() as db:
            result = await ai_processor.process_meeting(meeting_id, db)
            if result:
                logger.info(
                    "✅ AI done: %d pain pts, %d actions, sentiment=%s",
                    result["pain_points_count"],
                    result["action_items_count"],
                    result["sentiment"],
                )
                await sio.emit("processing_complete", {
                    "meetingId": meeting_id,
                    "summary": result,
                }, room=room_code)
    except Exception as exc:
        logger.error("AI processing failed: %s", exc)


# ═══════════════════════════════════════════════════════════════════════════
# STARTUP
# ═══════════════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup():
    logger.info("🚀 Starting AI Call Intelligence Platform")
    await init_db()
    logger.info("✅ SQLite database ready")

    # Clean up stale meetings from previous runs
    async with async_session_maker() as db:
        try:
            result = await db.execute(
                select(Meeting).where(Meeting.status.in_(["live", "waiting", "scheduled"]))
            )
            stale = result.scalars().all()
            for m in stale:
                m.status = "ended"
                if not m.ended_at:
                    m.ended_at = datetime.utcnow()
                if m.started_at and not m.duration_minutes:
                    dur = (m.ended_at - m.started_at).total_seconds() / 60
                    m.duration_minutes = max(1, round(dur))
            if stale:
                await db.commit()
                logger.info("🧹 Cleaned up %d stale meetings", len(stale))
        except Exception as exc:
            logger.error("Stale meeting cleanup error: %s", exc)

    logger.info("🎙️ Sarvam AI service initialised")
    logger.info("🤖 AI Processor ready")
