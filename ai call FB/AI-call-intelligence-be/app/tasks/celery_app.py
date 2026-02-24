"""Celery application configuration."""

from celery import Celery
from celery.schedules import crontab

from app.config import get_settings

settings = get_settings()

celery_app = Celery(
    "ai_call_intelligence",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.tasks.notifications"],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour max per task
    task_soft_time_limit=3300,  # Soft limit at 55 min
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=100,
)

# Periodic beat schedule
celery_app.conf.beat_schedule = {
    # Daily: scan for overdue action items
    "daily-overdue-scan": {
        "task": "app.tasks.notifications.scan_overdue_actions",
        "schedule": crontab(hour=9, minute=0),  # Every day at 9 AM UTC
    },
    # Weekly: recurring pain point alerts
    "weekly-pain-point-alerts": {
        "task": "app.tasks.notifications.weekly_pain_point_alerts",
        "schedule": crontab(hour=10, minute=0, day_of_week="monday"),  # Every Monday 10 AM
    },
    # Monthly: QBR preparation
    "monthly-qbr-prep": {
        "task": "app.tasks.notifications.monthly_qbr_preparation",
        "schedule": crontab(hour=9, minute=0, day_of_month="1"),  # 1st of every month
    },
    # Daily: low sentiment warnings
    "daily-low-sentiment-check": {
        "task": "app.tasks.notifications.low_sentiment_warnings",
        "schedule": crontab(hour=8, minute=0),  # Every day at 8 AM UTC
    },
}
