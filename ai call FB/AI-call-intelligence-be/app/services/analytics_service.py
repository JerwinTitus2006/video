"""Multi-meeting analytics aggregation service."""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.action_item import ActionItem
from app.models.meeting import Meeting, meeting_persons
from app.models.pain_point import PainPoint
from app.models.person import Person
from app.models.sentiment import SentimentSegment

logger = logging.getLogger(__name__)


async def get_person_analytics(
    person_id: str,
    months: int,
    db: AsyncSession,
) -> dict[str, Any]:
    """
    Multi-meeting aggregation for a person:
    - All meetings for person
    - Pain point frequency by label
    - Sentiment trends (N-month moving avg)
    - Resolution rate (completed / total actions)
    - Health score (0-100)
    """
    person_uuid = uuid.UUID(person_id)
    cutoff_date = datetime.utcnow() - timedelta(days=months * 30)

    # Get person
    person_result = await db.execute(select(Person).where(Person.id == person_uuid))
    person = person_result.scalar_one_or_none()
    if not person:
        raise ValueError(f"Person {person_id} not found")

    # Get meetings for person
    meeting_ids_query = (
        select(meeting_persons.c.meeting_id)
        .where(meeting_persons.c.person_id == person_uuid)
    )
    meeting_ids_result = await db.execute(meeting_ids_query)
    meeting_ids = [row[0] for row in meeting_ids_result]
    total_meetings = len(meeting_ids)

    # ---- Pain Point Frequencies ----
    pp_query = (
        select(PainPoint.label, func.count(PainPoint.id))
        .where(
            and_(
                PainPoint.person_id == person_uuid,
                PainPoint.created_at >= cutoff_date,
            )
        )
        .group_by(PainPoint.label)
    )
    pp_result = await db.execute(pp_query)
    pp_counts = {row[0]: row[1] for row in pp_result}
    total_pp = sum(pp_counts.values()) or 1

    pain_point_frequencies = [
        {
            "label": label,
            "count": count,
            "percentage": round(count / total_pp * 100, 1),
        }
        for label, count in pp_counts.items()
    ]

    # ---- Sentiment Trends (monthly) ----
    sentiment_trends = []
    for i in range(months):
        period_start = datetime.utcnow() - timedelta(days=(months - i) * 30)
        period_end = datetime.utcnow() - timedelta(days=(months - i - 1) * 30)

        avg_query = (
            select(func.avg(SentimentSegment.score), func.count(SentimentSegment.id))
            .where(
                and_(
                    SentimentSegment.person_id == person_uuid,
                    SentimentSegment.created_at >= period_start,
                    SentimentSegment.created_at < period_end,
                )
            )
        )
        avg_result = await db.execute(avg_query)
        row = avg_result.first()
        avg_score = float(row[0]) if row[0] else 0.0
        meeting_count = row[1] if row[1] else 0

        sentiment_trends.append({
            "period": period_start.strftime("%Y-%m"),
            "average_score": round(avg_score, 2),
            "meeting_count": meeting_count,
        })

    # ---- Resolution Rate ----
    total_actions_result = await db.execute(
        select(func.count(ActionItem.id)).where(
            ActionItem.meeting_id.in_(meeting_ids) if meeting_ids else ActionItem.id == None
        )
    )
    total_actions = total_actions_result.scalar() or 0

    completed_actions_result = await db.execute(
        select(func.count(ActionItem.id)).where(
            and_(
                ActionItem.meeting_id.in_(meeting_ids) if meeting_ids else ActionItem.id == None,
                ActionItem.status == "completed",
            )
        )
    )
    completed_actions = completed_actions_result.scalar() or 0

    resolution_rate = round(completed_actions / total_actions * 100, 1) if total_actions > 0 else 0.0

    # ---- Health Score (0-100) ----
    # Composite: 40% sentiment + 30% resolution + 30% pain point trend
    avg_sentiment = sentiment_trends[-1]["average_score"] if sentiment_trends else 0.0
    sentiment_component = ((avg_sentiment + 1) / 2) * 40  # normalize -1..+1 to 0..40

    resolution_component = (resolution_rate / 100) * 30

    # Pain point trend: fewer = better
    recent_pp_count = sum(f["count"] for f in pain_point_frequencies)
    pp_component = max(0, 30 - (recent_pp_count * 2))  # Lose 2 points per pain point

    health_score = round(min(100, max(0, sentiment_component + resolution_component + pp_component)), 1)

    # Update person health score
    person.health_score = health_score
    await db.commit()

    # ---- Recent items ----
    recent_pp = await db.execute(
        select(PainPoint)
        .where(PainPoint.person_id == person_uuid)
        .order_by(PainPoint.created_at.desc())
        .limit(5)
    )
    recent_actions = await db.execute(
        select(ActionItem)
        .where(ActionItem.meeting_id.in_(meeting_ids) if meeting_ids else ActionItem.id == None)
        .order_by(ActionItem.created_at.desc())
        .limit(5)
    )

    return {
        "person_id": person_id,
        "person_name": person.name,
        "total_meetings": total_meetings,
        "pain_point_frequencies": pain_point_frequencies,
        "sentiment_trends": sentiment_trends,
        "resolution_rate": resolution_rate,
        "health_score": health_score,
        "recent_pain_points": [
            {"id": str(pp.id), "text": pp.text, "label": pp.label, "status": pp.status}
            for pp in recent_pp.scalars().all()
        ],
        "recent_action_items": [
            {"id": str(ai.id), "description": ai.description, "status": ai.status, "owner": ai.owner}
            for ai in recent_actions.scalars().all()
        ],
    }


async def get_meeting_analytics(meeting_id: str, db: AsyncSession) -> dict[str, Any]:
    """Get analytics summary for a single meeting."""
    meeting_uuid = uuid.UUID(meeting_id)

    meeting_result = await db.execute(select(Meeting).where(Meeting.id == meeting_uuid))
    meeting = meeting_result.scalar_one_or_none()
    if not meeting:
        raise ValueError(f"Meeting {meeting_id} not found")

    # Average sentiment
    avg_sent = await db.execute(
        select(func.avg(SentimentSegment.score)).where(SentimentSegment.meeting_id == meeting_uuid)
    )
    avg_sentiment = float(avg_sent.scalar() or 0.0)

    # Counts
    pp_count = (await db.execute(
        select(func.count(PainPoint.id)).where(PainPoint.meeting_id == meeting_uuid)
    )).scalar() or 0

    ai_total = (await db.execute(
        select(func.count(ActionItem.id)).where(ActionItem.meeting_id == meeting_uuid)
    )).scalar() or 0

    ai_completed = (await db.execute(
        select(func.count(ActionItem.id)).where(
            and_(ActionItem.meeting_id == meeting_uuid, ActionItem.status == "completed")
        )
    )).scalar() or 0

    resolution_rate = round(ai_completed / ai_total * 100, 1) if ai_total > 0 else 0.0

    return {
        "meeting_id": meeting_id,
        "title": meeting.title,
        "average_sentiment": round(avg_sentiment, 2),
        "pain_point_count": pp_count,
        "action_item_count": ai_total,
        "resolution_rate": resolution_rate,
    }


async def get_dashboard_stats(days: int, db: AsyncSession) -> dict[str, Any]:
    """Get high-level dashboard metrics."""
    cutoff = datetime.utcnow() - timedelta(days=days)

    total_meetings = (await db.execute(
        select(func.count(Meeting.id)).where(Meeting.created_at >= cutoff)
    )).scalar() or 0

    total_pain_points = (await db.execute(
        select(func.count(PainPoint.id)).where(PainPoint.created_at >= cutoff)
    )).scalar() or 0

    open_pain_points = (await db.execute(
        select(func.count(PainPoint.id)).where(
            and_(PainPoint.created_at >= cutoff, PainPoint.status == "open")
        )
    )).scalar() or 0

    total_actions = (await db.execute(
        select(func.count(ActionItem.id)).where(ActionItem.created_at >= cutoff)
    )).scalar() or 0

    completed_actions = (await db.execute(
        select(func.count(ActionItem.id)).where(
            and_(ActionItem.created_at >= cutoff, ActionItem.status == "completed")
        )
    )).scalar() or 0

    avg_sentiment = (await db.execute(
        select(func.avg(SentimentSegment.score)).where(SentimentSegment.created_at >= cutoff)
    )).scalar()

    return {
        "period_days": days,
        "total_meetings": total_meetings,
        "total_pain_points": total_pain_points,
        "open_pain_points": open_pain_points,
        "total_action_items": total_actions,
        "completed_action_items": completed_actions,
        "resolution_rate": round(completed_actions / total_actions * 100, 1) if total_actions > 0 else 0.0,
        "average_sentiment": round(float(avg_sentiment or 0), 2),
    }
