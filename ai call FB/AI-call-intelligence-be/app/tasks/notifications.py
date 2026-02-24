"""Celery notification and background tasks."""

import asyncio
import logging
from datetime import date, datetime, timedelta

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


def _run_async(coro):
    """Helper to run an async function from a sync Celery task."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ============================================================
# 1. Daily Overdue Action Scan
# ============================================================

@celery_app.task(name="app.tasks.notifications.scan_overdue_actions")
def scan_overdue_actions():
    """Scan for action items past their due date and send notifications."""
    logger.info("Starting daily overdue action scan...")
    _run_async(_scan_overdue_actions_async())
    return {"status": "completed"}


async def _scan_overdue_actions_async():
    from sqlalchemy import select, and_
    from app.database import AsyncSessionLocal
    from app.models.action_item import ActionItem

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(ActionItem).where(
                and_(
                    ActionItem.due_date < date.today(),
                    ActionItem.status.in_(["pending", "in_progress"]),
                )
            )
        )
        overdue_items = result.scalars().all()

        for item in overdue_items:
            # In production: send email/Slack notification to item.owner
            logger.warning(
                f"OVERDUE: Action item {item.id} - '{item.description[:50]}...' "
                f"owned by {item.owner}, due {item.due_date}"
            )

        logger.info(f"Found {len(overdue_items)} overdue action items")


# ============================================================
# 2. Weekly Recurring Pain Point Alerts
# ============================================================

@celery_app.task(name="app.tasks.notifications.weekly_pain_point_alerts")
def weekly_pain_point_alerts():
    """Check for recurring pain points across recent meetings."""
    logger.info("Starting weekly pain point analysis...")
    _run_async(_weekly_pain_point_alerts_async())
    return {"status": "completed"}


async def _weekly_pain_point_alerts_async():
    from sqlalchemy import select, func, and_
    from app.database import AsyncSessionLocal
    from app.models.pain_point import PainPoint

    async with AsyncSessionLocal() as db:
        # Find pain points that appear in 3+ meetings in the last 30 days
        cutoff = datetime.utcnow() - timedelta(days=30)

        result = await db.execute(
            select(
                PainPoint.text,
                PainPoint.label,
                func.count(PainPoint.id).label("occurrence_count"),
            )
            .where(
                and_(
                    PainPoint.created_at >= cutoff,
                    PainPoint.status == "open",
                )
            )
            .group_by(PainPoint.text, PainPoint.label)
            .having(func.count(PainPoint.id) >= 3)
        )

        recurring = result.all()
        for item in recurring:
            logger.warning(
                f"RECURRING PAIN POINT: '{item.text[:80]}...' ({item.label}) "
                f"appeared {item.occurrence_count} times in 30 days"
            )

        logger.info(f"Found {len(recurring)} recurring pain points")


# ============================================================
# 3. Monthly QBR Preparation
# ============================================================

@celery_app.task(name="app.tasks.notifications.monthly_qbr_preparation")
def monthly_qbr_preparation():
    """Trigger QBR report generation for all active persons."""
    logger.info("Starting monthly QBR preparation...")
    _run_async(_monthly_qbr_prep_async())
    return {"status": "completed"}


async def _monthly_qbr_prep_async():
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models.person import Person
    from app.services.report_service import generate_qbr_report
    from app.models.report import Report

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Person))
        persons = result.scalars().all()

        for person in persons:
            # Create report record
            report = Report(
                person_id=person.id,
                report_type="qbr",
                title=f"Monthly QBR - {person.name}",
                status="generating",
            )
            db.add(report)
            await db.flush()
            await db.refresh(report)

            logger.info(f"Generating QBR for {person.name} (report {report.id})")

        await db.commit()

        # Note: actual generation would be triggered separately
        logger.info(f"Queued QBR generation for {len(persons)} persons")


# ============================================================
# 4. Low Sentiment Warnings
# ============================================================

@celery_app.task(name="app.tasks.notifications.low_sentiment_warnings")
def low_sentiment_warnings():
    """Check for persons with consistently low sentiment scores."""
    logger.info("Starting low sentiment check...")
    _run_async(_low_sentiment_warnings_async())
    return {"status": "completed"}


async def _low_sentiment_warnings_async():
    from sqlalchemy import select, func, and_
    from app.database import AsyncSessionLocal
    from app.models.sentiment import SentimentSegment
    from app.models.person import Person

    async with AsyncSessionLocal() as db:
        cutoff = datetime.utcnow() - timedelta(days=7)

        # Find persons with avg sentiment < -0.3 in the last week
        result = await db.execute(
            select(
                SentimentSegment.person_id,
                func.avg(SentimentSegment.score).label("avg_score"),
                func.count(SentimentSegment.id).label("segment_count"),
            )
            .where(
                and_(
                    SentimentSegment.created_at >= cutoff,
                    SentimentSegment.person_id.isnot(None),
                )
            )
            .group_by(SentimentSegment.person_id)
            .having(func.avg(SentimentSegment.score) < -0.3)
        )

        low_sentiment = result.all()
        for item in low_sentiment:
            # Get person name
            person_result = await db.execute(
                select(Person).where(Person.id == item.person_id)
            )
            person = person_result.scalar_one_or_none()
            name = person.name if person else "Unknown"

            logger.warning(
                f"LOW SENTIMENT: {name} has avg score {item.avg_score:.2f} "
                f"across {item.segment_count} segments in the last 7 days"
            )

        logger.info(f"Found {len(low_sentiment)} persons with low sentiment")


# ============================================================
# 5. Long-Running Processing Tasks
# ============================================================

@celery_app.task(name="app.tasks.notifications.process_meeting_recording", bind=True)
def process_meeting_recording(self, meeting_id: str, audio_path: str):
    """Process a meeting recording through the full AI pipeline (for Celery queue)."""
    from app.routers.webhooks import _process_recording

    logger.info(f"Celery: Processing meeting {meeting_id}")
    self.update_state(state="PROCESSING", meta={"meeting_id": meeting_id})

    _run_async(_process_recording(meeting_id, audio_path))

    return {"status": "completed", "meeting_id": meeting_id}
