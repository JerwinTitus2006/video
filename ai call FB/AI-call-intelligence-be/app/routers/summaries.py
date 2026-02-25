"""Meeting Summaries router."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.meeting_summary import MeetingSummary
from app.models.meeting import Meeting
from app.schemas.meeting_summary import (
    MeetingSummaryCreate,
    MeetingSummaryResponse,
    MeetingSummaryUpdate,
)

router = APIRouter(prefix="/summaries", tags=["Meeting Summaries"])


@router.get("/meeting/{meeting_id}", response_model=MeetingSummaryResponse)
async def get_meeting_summary(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get summary for a specific meeting."""
    result = await db.execute(
        select(MeetingSummary).where(MeetingSummary.meeting_id == meeting_id)
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found for this meeting")
    return summary


@router.get("/{summary_id}", response_model=MeetingSummaryResponse)
async def get_summary(summary_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a summary by ID."""
    result = await db.execute(
        select(MeetingSummary).where(MeetingSummary.id == summary_id)
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    return summary


@router.post("", response_model=MeetingSummaryResponse, status_code=201)
async def create_summary(data: MeetingSummaryCreate, db: AsyncSession = Depends(get_db)):
    """Create a meeting summary."""
    # Check if meeting exists
    meeting_result = await db.execute(
        select(Meeting).where(Meeting.id == data.meeting_id)
    )
    if not meeting_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Check if summary already exists
    existing = await db.execute(
        select(MeetingSummary).where(MeetingSummary.meeting_id == data.meeting_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Summary already exists for this meeting")

    summary = MeetingSummary(
        meeting_id=data.meeting_id,
        title=data.title,
        executive_summary=data.executive_summary,
        key_points=data.key_points,
        decisions_made=data.decisions_made,
        topics_discussed=data.topics_discussed,
        next_steps=data.next_steps,
        participants_summary=data.participants_summary,
    )
    db.add(summary)
    await db.flush()
    await db.refresh(summary)
    return summary


@router.put("/{summary_id}", response_model=MeetingSummaryResponse)
async def update_summary(
    summary_id: UUID,
    data: MeetingSummaryUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a meeting summary."""
    result = await db.execute(
        select(MeetingSummary).where(MeetingSummary.id == summary_id)
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(summary, key, value)

    await db.flush()
    await db.refresh(summary)
    return summary


@router.delete("/{summary_id}", status_code=204)
async def delete_summary(summary_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a meeting summary."""
    result = await db.execute(
        select(MeetingSummary).where(MeetingSummary.id == summary_id)
    )
    summary = result.scalar_one_or_none()
    if not summary:
        raise HTTPException(status_code=404, detail="Summary not found")
    await db.delete(summary)


@router.post("/meeting/{meeting_id}/regenerate", response_model=MeetingSummaryResponse)
async def regenerate_summary(meeting_id: UUID, db: AsyncSession = Depends(get_db)):
    """Regenerate summary for a meeting using AI."""
    from app.services.ai_api_service import ai_service
    from app.models.pain_point import PainPoint
    from app.models.action_item import ActionItem

    # Get meeting
    meeting_result = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = meeting_result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if not meeting.transcript:
        raise HTTPException(status_code=400, detail="Meeting has no transcript")

    # Get pain points
    pp_result = await db.execute(
        select(PainPoint).where(PainPoint.meeting_id == meeting_id)
    )
    pain_points = [{"text": pp.text, "label": pp.label} for pp in pp_result.scalars().all()]

    # Get action items
    ai_result = await db.execute(
        select(ActionItem).where(ActionItem.meeting_id == meeting_id)
    )
    action_items = [{"description": ai.description} for ai in ai_result.scalars().all()]

    # Generate new summary
    summary_data = await ai_service.generate_meeting_summary(
        transcript=meeting.transcript,
        pain_points=pain_points,
        action_items=action_items,
    )

    # Delete existing summary if any
    existing = await db.execute(
        select(MeetingSummary).where(MeetingSummary.meeting_id == meeting_id)
    )
    existing_summary = existing.scalar_one_or_none()
    if existing_summary:
        await db.delete(existing_summary)

    # Create new summary
    summary = MeetingSummary(
        meeting_id=meeting_id,
        title=summary_data.get("title"),
        executive_summary=summary_data.get("executive_summary"),
        key_points=summary_data.get("key_points", []),
        decisions_made=summary_data.get("decisions_made", []),
        topics_discussed=summary_data.get("topics_discussed", []),
        next_steps=summary_data.get("next_steps", []),
        participants_summary=summary_data.get("participants_summary", {}),
    )
    db.add(summary)
    await db.commit()
    await db.refresh(summary)
    return summary
