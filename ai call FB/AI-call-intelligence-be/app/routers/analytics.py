"""Analytics endpoints router."""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


# ============================================================
# Response Schemas
# ============================================================

class PainPointFrequency(BaseModel):
    label: str
    count: int
    percentage: float


class SentimentTrend(BaseModel):
    period: str
    average_score: float
    meeting_count: int


class PersonAnalytics(BaseModel):
    person_id: UUID
    person_name: str
    total_meetings: int
    pain_point_frequencies: List[PainPointFrequency]
    sentiment_trends: List[SentimentTrend]
    resolution_rate: float
    health_score: float
    recent_pain_points: List[dict]
    recent_action_items: List[dict]


class MeetingAnalytics(BaseModel):
    meeting_id: UUID
    title: str
    average_sentiment: float
    pain_point_count: int
    action_item_count: int
    resolution_rate: float


# ============================================================
# Endpoints
# ============================================================

@router.get("/person/{person_id}", response_model=PersonAnalytics)
async def get_person_analytics(
    person_id: UUID,
    months: int = Query(3, ge=1, le=24, description="Number of months for trend analysis"),
    db: AsyncSession = Depends(get_db),
):
    """
    Multi-meeting aggregation for a person:
    - Aggregate pain point frequencies
    - Calculate sentiment trends (N-month moving avg)
    - Resolution rate (completed actions / total)
    - Health score (0-100)
    """
    from app.services.analytics_service import get_person_analytics

    result = await get_person_analytics(
        person_id=str(person_id),
        months=months,
        db=db,
    )
    return result


@router.get("/meeting/{meeting_id}", response_model=MeetingAnalytics)
async def get_meeting_analytics(
    meeting_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get analytics summary for a single meeting."""
    from app.services.analytics_service import get_meeting_analytics

    result = await get_meeting_analytics(meeting_id=str(meeting_id), db=db)
    return result


@router.get("/dashboard")
async def get_dashboard_analytics(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
):
    """Get high-level dashboard metrics."""
    from app.services.analytics_service import get_dashboard_stats

    return await get_dashboard_stats(days=days, db=db)
