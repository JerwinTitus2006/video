"""Sentiment Segments CRUD router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sentiment import SentimentSegment
from app.schemas.sentiment import (
    SentimentSegmentCreate,
    SentimentSegmentListResponse,
    SentimentSegmentResponse,
    SentimentSegmentUpdate,
)

router = APIRouter(prefix="/sentiment_segments", tags=["Sentiment"])


@router.get("", response_model=SentimentSegmentListResponse)
async def list_sentiment_segments(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    meeting_id: Optional[UUID] = None,
    person_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(SentimentSegment)
    count_query = select(func.count(SentimentSegment.id))

    if meeting_id:
        query = query.where(SentimentSegment.meeting_id == meeting_id)
        count_query = count_query.where(SentimentSegment.meeting_id == meeting_id)
    if person_id:
        query = query.where(SentimentSegment.person_id == person_id)
        count_query = count_query.where(SentimentSegment.person_id == person_id)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(SentimentSegment.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return SentimentSegmentListResponse(items=items, total=total, page=page, size=size)


@router.get("/{segment_id}", response_model=SentimentSegmentResponse)
async def get_sentiment_segment(segment_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SentimentSegment).where(SentimentSegment.id == segment_id))
    seg = result.scalar_one_or_none()
    if not seg:
        raise HTTPException(status_code=404, detail="Sentiment segment not found")
    return seg


@router.post("", response_model=SentimentSegmentResponse, status_code=201)
async def create_sentiment_segment(data: SentimentSegmentCreate, db: AsyncSession = Depends(get_db)):
    seg = SentimentSegment(**data.model_dump())
    db.add(seg)
    await db.flush()
    await db.refresh(seg)
    return seg


@router.put("/{segment_id}", response_model=SentimentSegmentResponse)
async def update_sentiment_segment(segment_id: UUID, data: SentimentSegmentUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SentimentSegment).where(SentimentSegment.id == segment_id))
    seg = result.scalar_one_or_none()
    if not seg:
        raise HTTPException(status_code=404, detail="Sentiment segment not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(seg, key, value)

    await db.flush()
    await db.refresh(seg)
    return seg


@router.delete("/{segment_id}", status_code=204)
async def delete_sentiment_segment(segment_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SentimentSegment).where(SentimentSegment.id == segment_id))
    seg = result.scalar_one_or_none()
    if not seg:
        raise HTTPException(status_code=404, detail="Sentiment segment not found")
    await db.delete(seg)
