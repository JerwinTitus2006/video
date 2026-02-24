"""Shared dependencies for FastAPI dependency injection."""

from app.config import get_settings, Settings


def get_app_settings() -> Settings:
    """Provide application settings as a dependency."""
    return get_settings()
