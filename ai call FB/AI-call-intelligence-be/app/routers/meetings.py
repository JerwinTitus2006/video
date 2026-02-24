"""Meetings CRUD router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
