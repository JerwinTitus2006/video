"""Meetings CRUD router."""

import re
import secrets
import string
import uuid as _uuid
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.database import get_db
from app.models.meeting import Meeting, meeting_persons
from app.models.person import Person
from app.schemas.meeting import (
    MeetingCreate,
    MeetingListResponse,
    MeetingResponse,
    MeetingUpdate,
)

router = APIRouter(prefix="/meetings", tags=["Meetings"])
settings = get_settings()


# ══════════════════════════════════════════════════════════════════════════════
# Google Meet-like Room ID Generation
# ══════════════════════════════════════════════════════════════════════════════

def _generate_meeting_code() -> str:
    """
    Generate a Google Meet-like meeting code.
    Format: xxx-xxxx-xxx (e.g., abc-defg-hij)
    """
    chars = string.ascii_lowercase
    part1 = ''.join(secrets.choice(chars) for _ in range(3))
    part2 = ''.join(secrets.choice(chars) for _ in range(4))
    part3 = ''.join(secrets.choice(chars) for _ in range(3))
    return f"{part1}-{part2}-{part3}"


def _make_room_id(title: str = None) -> str:
    """Generate a URL-safe room ID with Google Meet-like format."""
    return _generate_meeting_code()


def _room_url(room_id: str) -> str:
    domain = settings.JITSI_DOMAIN.rstrip("/")
    # Ensure we don't double-up http/https prefix
    if not domain.startswith("http"):
        domain = f"https://{domain}"
    return f"{domain}/{room_id}"


def _generate_join_url(meeting_id: str, room_id: str) -> str:
    """Generate the full join URL for participants."""
    return f"/meeting/{room_id}?mid={meeting_id}"


# ══════════════════════════════════════════════════════════════════════════════
# Meeting Lifecycle Response Models
# ══════════════════════════════════════════════════════════════════════════════

class JitsiRoomResponse(BaseModel):
    """Returned whenever a meeting room URL is generated."""
    meeting_id: str
    jitsi_room_id: str
    room_url: str
    join_url: str = ""
    status: str


class InstantMeetingResponse(BaseModel):
    """Response for instant meeting creation (like Google Meet 'New meeting')."""
    meeting_id: str
    meeting_code: str
    room_url: str
    join_url: str
    share_link: str
    status: str
    created_at: str


class ScheduleMeetingRequest(BaseModel):
    """Request to schedule a future meeting."""
    title: str
    scheduled_start: datetime
    scheduled_end: Optional[datetime] = None
    description: Optional[str] = None
    participant_emails: Optional[list[str]] = None


class ScheduleMeetingResponse(BaseModel):
    """Response for scheduled meeting."""
    meeting_id: str
    meeting_code: str
    title: str
    room_url: str
    join_url: str
    share_link: str
    scheduled_start: str
    scheduled_end: Optional[str]
    status: str


# ══════════════════════════════════════════════════════════════════════════════
# Google Meet-like Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/instant", response_model=InstantMeetingResponse, status_code=201)
async def create_instant_meeting(
    db: AsyncSession = Depends(get_db),
):
    """
    Create an instant meeting (like clicking 'New meeting' in Google Meet).
    Returns a shareable link that can be joined immediately.
    """
    meeting_code = _generate_meeting_code()
    
    meeting = Meeting(
        title=f"Meeting {meeting_code}",
        jitsi_room_id=meeting_code,
        status="pending",
        started_at=datetime.utcnow(),
    )
    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)
    await db.commit()

    room_url = _room_url(meeting_code)
    join_url = _generate_join_url(str(meeting.id), meeting_code)
    
    return InstantMeetingResponse(
        meeting_id=str(meeting.id),
        meeting_code=meeting_code,
        room_url=room_url,
        join_url=join_url,
        share_link=room_url,
        status=meeting.status,
        created_at=meeting.created_at.isoformat(),
    )


@router.post("/schedule", response_model=ScheduleMeetingResponse, status_code=201)
async def schedule_meeting(
    data: ScheduleMeetingRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Schedule a meeting for a future time (like 'Schedule in Google Calendar').
    """
    meeting_code = _generate_meeting_code()
    
    meeting = Meeting(
        title=data.title,
        jitsi_room_id=meeting_code,
        status="scheduled",
        started_at=data.scheduled_start,
        ended_at=data.scheduled_end,
    )
    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)
    await db.commit()

    room_url = _room_url(meeting_code)
    join_url = _generate_join_url(str(meeting.id), meeting_code)
    
    return ScheduleMeetingResponse(
        meeting_id=str(meeting.id),
        meeting_code=meeting_code,
        title=meeting.title,
        room_url=room_url,
        join_url=join_url,
        share_link=room_url,
        scheduled_start=data.scheduled_start.isoformat(),
        scheduled_end=data.scheduled_end.isoformat() if data.scheduled_end else None,
        status=meeting.status,
    )


@router.get("/join/{meeting_code}", response_model=JitsiRoomResponse)
async def join_meeting_by_code(
    meeting_code: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Join a meeting using its code (like entering a code in Google Meet).
    Creates the meeting if it doesn't exist.
    """
    # Try to find existing meeting with this code
    result = await db.execute(
        select(Meeting).where(Meeting.jitsi_room_id == meeting_code)
    )
    meeting = result.scalar_one_or_none()
    
    if not meeting:
        # Create a new meeting with this code (allows ad-hoc joining)
        meeting = Meeting(
            title=f"Meeting {meeting_code}",
            jitsi_room_id=meeting_code,
            status="pending",
            started_at=datetime.utcnow(),
        )
        db.add(meeting)
        await db.flush()
        await db.refresh(meeting)
        await db.commit()

    room_url = _room_url(meeting_code)
    join_url = _generate_join_url(str(meeting.id), meeting_code)
    
    return JitsiRoomResponse(
        meeting_id=str(meeting.id),
        jitsi_room_id=meeting.jitsi_room_id,
        room_url=room_url,
        join_url=join_url,
        status=meeting.status,
    )


@router.post("/{meeting_id}/end")
async def end_meeting(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    End a meeting and trigger AI processing pipeline.
    """
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.status = "processing"
    meeting.ended_at = datetime.utcnow()
    await db.commit()
    await db.refresh(meeting)

    return {
        "meeting_id": str(meeting.id),
        "status": meeting.status,
        "ended_at": meeting.ended_at.isoformat(),
        "message": "Meeting ended. AI processing will begin once recording is uploaded.",
    }


# ══════════════════════════════════════════════════════════════════════════════
# Standard CRUD
# ══════════════════════════════════════════════════════════════════════════════

@router.get("", response_model=MeetingListResponse)
async def list_meetings(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List meetings with pagination and optional status filter."""
    query = select(Meeting)
    count_query = select(func.count(Meeting.id))

    if status:
        query = query.where(Meeting.status == status)
        count_query = count_query.where(Meeting.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Meeting.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return MeetingListResponse(items=items, total=total, page=page, size=size)


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single meeting by ID."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("", response_model=MeetingResponse, status_code=201)
async def create_meeting(data: MeetingCreate, db: AsyncSession = Depends(get_db)):
    """Create a new meeting."""
    meeting = Meeting(
        title=data.title,
        jitsi_room_id=data.jitsi_room_id,
        recording_url=data.recording_url,
        started_at=data.started_at,
        ended_at=data.ended_at,
    )

    # Attach participants if provided
    if data.participant_ids:
        result = await db.execute(select(Person).where(Person.id.in_(data.participant_ids)))
        participants = result.scalars().all()
        meeting.participants = list(participants)

    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)
    return meeting


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(meeting_id: UUID, data: MeetingUpdate, db: AsyncSession = Depends(get_db)):
    """Update a meeting."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(meeting, key, value)

    await db.flush()
    await db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a meeting."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    await db.delete(meeting)


# ══════════════════════════════════════════════════════════════════════════════
# Jitsi meeting lifecycle endpoints
# ══════════════════════════════════════════════════════════════════════════════

class JitsiRoomResponse(BaseModel):
    """Returned whenever a Jitsi room URL is generated."""
    meeting_id: str
    jitsi_room_id: str
    room_url: str
    status: str


@router.post("/{meeting_id}/start", response_model=JitsiRoomResponse)
async def start_jitsi_meeting(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Assign (or re-use) a Jitsi room ID for this meeting and return the
    room URL the host should open.  Also stamps started_at and sets
    status → in_progress.
    """
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Assign a room ID only once
    if not meeting.jitsi_room_id:
        meeting.jitsi_room_id = _make_room_id(meeting.title)

    meeting.status = "pending"
    if not meeting.started_at:
        meeting.started_at = datetime.utcnow()

    await db.commit()
    await db.refresh(meeting)

    return JitsiRoomResponse(
        meeting_id=str(meeting.id),
        jitsi_room_id=meeting.jitsi_room_id,
        room_url=_room_url(meeting.jitsi_room_id),
        status=meeting.status,
    )


@router.post("/{meeting_id}/join", response_model=JitsiRoomResponse)
async def join_jitsi_meeting(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Return the Jitsi room URL for a participant to join.
    Creates the room ID if it doesn't exist yet.
    """
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.jitsi_room_id:
        meeting.jitsi_room_id = _make_room_id(meeting.title)
        await db.commit()
        await db.refresh(meeting)

    return JitsiRoomResponse(
        meeting_id=str(meeting.id),
        jitsi_room_id=meeting.jitsi_room_id,
        room_url=_room_url(meeting.jitsi_room_id),
        status=meeting.status,
    )


# ── Jitsi meeting lifecycle endpoints ─────────────────────────────────────────

class QuickStartRequest(BaseModel):
    title: str = "Quick Meeting"
    participant_name: Optional[str] = None


@router.post("/quick-start", response_model=JitsiRoomResponse, status_code=201)
async def quick_start_meeting(data: QuickStartRequest, db: AsyncSession = Depends(get_db)):
    """
    One-shot: create a Meeting record **and** return a room URL in a
    single request. Same as /instant but with optional title.
    """
    room_id = _make_room_id()
    meeting = Meeting(
        title=data.title,
        jitsi_room_id=room_id,
        status="pending",
        started_at=datetime.utcnow(),
    )
    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)
    await db.commit()

    room_url = _room_url(room_id)
    join_url = _generate_join_url(str(meeting.id), room_id)

    return JitsiRoomResponse(
        meeting_id=str(meeting.id),
        jitsi_room_id=meeting.jitsi_room_id,
        room_url=room_url,
        join_url=join_url,
        status=meeting.status,
    )


@router.post("/{meeting_id}/start", response_model=JitsiRoomResponse)
async def start_meeting(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Start an existing meeting and return the room URL.
    """
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.jitsi_room_id:
        meeting.jitsi_room_id = _make_room_id()

    meeting.status = "pending"
    if not meeting.started_at:
        meeting.started_at = datetime.utcnow()

    await db.commit()
    await db.refresh(meeting)

    room_url = _room_url(meeting.jitsi_room_id)
    join_url = _generate_join_url(str(meeting.id), meeting.jitsi_room_id)

    return JitsiRoomResponse(
        meeting_id=str(meeting.id),
        jitsi_room_id=meeting.jitsi_room_id,
        room_url=room_url,
        join_url=join_url,
        status=meeting.status,
    )


@router.post("/{meeting_id}/join", response_model=JitsiRoomResponse)
async def join_meeting(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """
    Join an existing meeting by its ID.
    """
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.jitsi_room_id:
        meeting.jitsi_room_id = _make_room_id()
        await db.commit()
        await db.refresh(meeting)

    room_url = _room_url(meeting.jitsi_room_id)
    join_url = _generate_join_url(str(meeting.id), meeting.jitsi_room_id)

    return JitsiRoomResponse(
        meeting_id=str(meeting.id),
        jitsi_room_id=meeting.jitsi_room_id,
        room_url=room_url,
        join_url=join_url,
        status=meeting.status,
    )


@router.get("/{meeting_id}/room", response_model=JitsiRoomResponse)
async def get_meeting_room(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get room details for a meeting."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not meeting.jitsi_room_id:
        raise HTTPException(status_code=404, detail="No room assigned to this meeting yet")

    room_url = _room_url(meeting.jitsi_room_id)
    join_url = _generate_join_url(str(meeting.id), meeting.jitsi_room_id)

    return JitsiRoomResponse(
        meeting_id=str(meeting.id),
        jitsi_room_id=meeting.jitsi_room_id,
        room_url=room_url,
        join_url=join_url,
        status=meeting.status,
    )


@router.get("/{meeting_id}/jitsi", response_model=JitsiRoomResponse)
async def get_meeting_jitsi(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get Jitsi room details for a meeting (alias for /room endpoint)."""
    return await get_meeting_room(meeting_id, db)


@router.get("", response_model=MeetingListResponse)
async def list_meetings(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List meetings with pagination and optional status filter."""
    query = select(Meeting)
    count_query = select(func.count(Meeting.id))

    if status:
        query = query.where(Meeting.status == status)
        count_query = count_query.where(Meeting.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Meeting.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return MeetingListResponse(items=items, total=total, page=page, size=size)


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single meeting by ID."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("", response_model=MeetingResponse, status_code=201)
async def create_meeting(data: MeetingCreate, db: AsyncSession = Depends(get_db)):
    """Create a new meeting."""
    meeting = Meeting(
        title=data.title,
        jitsi_room_id=data.jitsi_room_id,
        recording_url=data.recording_url,
        started_at=data.started_at,
        ended_at=data.ended_at,
    )

    # Attach participants if provided
    if data.participant_ids:
        result = await db.execute(select(Person).where(Person.id.in_(data.participant_ids)))
        participants = result.scalars().all()
        meeting.participants = list(participants)

    db.add(meeting)
    await db.flush()
    await db.refresh(meeting)
    return meeting


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(meeting_id: UUID, data: MeetingUpdate, db: AsyncSession = Depends(get_db)):
    """Update a meeting."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(meeting, key, value)

    await db.flush()
    await db.refresh(meeting)
    return meeting


@router.delete("/{meeting_id}", status_code=204)
async def delete_meeting(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a meeting."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    await db.delete(meeting)
