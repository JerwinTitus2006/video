"""Meetings CRUD router."""

import re
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
# Jitsi helpers
# ══════════════════════════════════════════════════════════════════════════════

def _make_room_id(title: str) -> str:
    """Derive a URL-safe Jitsi room ID from a meeting title."""
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", title.strip()).strip("-").lower()
    return f"{slug}-{_uuid.uuid4().hex[:6]}" if slug else _uuid.uuid4().hex


def _room_url(room_id: str) -> str:
    domain = settings.JITSI_DOMAIN.rstrip("/")
    # Ensure we don't double-up http/https prefix
    if not domain.startswith("http"):
        domain = f"http://{domain}"
    return f"{domain}/{room_id}"


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


@router.get("/{meeting_id}/jitsi", response_model=JitsiRoomResponse)
async def get_jitsi_info(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """Return Jitsi room details for a meeting (read-only, no side effects)."""
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not meeting.jitsi_room_id:
        raise HTTPException(status_code=404, detail="No Jitsi room assigned to this meeting yet")

    return JitsiRoomResponse(
        meeting_id=str(meeting.id),
        jitsi_room_id=meeting.jitsi_room_id,
        room_url=_room_url(meeting.jitsi_room_id),
        status=meeting.status,
    )


# ── Quick-create + immediately start ─────────────────────────────────────────

class QuickStartRequest(BaseModel):
    title: str = "Quick Meeting"
    participant_name: Optional[str] = None


@router.post("/quick-start", response_model=JitsiRoomResponse, status_code=201)
async def quick_start_meeting(data: QuickStartRequest, db: AsyncSession = Depends(get_db)):
    """
    One-shot: create a Meeting record **and** return a Jitsi room URL in a
    single request.  Useful when the UI wants to start a meeting immediately
    without a two-step create → start flow.
    """
    room_id = _make_room_id(data.title)
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

    return JitsiRoomResponse(
        meeting_id=str(meeting.id),
        jitsi_room_id=meeting.jitsi_room_id,
        room_url=_room_url(meeting.jitsi_room_id),
        status=meeting.status,
    )



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
