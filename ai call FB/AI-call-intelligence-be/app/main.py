"""FastAPI application entry point."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.database import create_tables

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    # Startup
    os.makedirs(settings.STORAGE_PATH, exist_ok=True)
    os.makedirs(os.path.join(settings.STORAGE_PATH, "recordings"), exist_ok=True)
    os.makedirs(os.path.join(settings.STORAGE_PATH, "reports"), exist_ok=True)

    # Auto-create tables in development (use Alembic in prod)
    if settings.DEBUG:
        await create_tables()

    yield

    # Shutdown
    pass


app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered call intelligence platform: transcription, speaker identification, pain point extraction, resource matching, sentiment analysis, and reporting.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Register all routers
# ============================================================

from app.routers import (
    webhooks,
    meetings,
    persons,
    pain_points,
    resources,
    action_items,
    sentiment,
    reports,
    ai,
    analytics,
    search,
    ws,
)

# Webhook
app.include_router(webhooks.router, prefix="/api/v1")

# CRUD
app.include_router(meetings.router, prefix="/api/v1")
app.include_router(persons.router, prefix="/api/v1")
app.include_router(pain_points.router, prefix="/api/v1")
app.include_router(resources.router, prefix="/api/v1")
app.include_router(action_items.router, prefix="/api/v1")
app.include_router(sentiment.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")

# AI Processing
app.include_router(ai.router, prefix="/api/v1")

# Analytics
app.include_router(analytics.router, prefix="/api/v1")

# Search
app.include_router(search.router, prefix="/api/v1")

# WebSocket (no prefix — mounted at root for /live/{meeting_id})
app.include_router(ws.router)


# ============================================================
# Health check
# ============================================================

@app.get("/health", tags=["Health"])
async def health_check():
    """Check if the API is running."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "webhooks": "/api/v1/webhooks/jitsi/recording",
            "meetings": "/api/v1/meetings",
            "persons": "/api/v1/persons",
            "pain_points": "/api/v1/pain_points",
            "resources": "/api/v1/resources",
            "action_items": "/api/v1/action_items",
            "sentiment": "/api/v1/sentiment_segments",
            "reports": "/api/v1/reports",
            "ai": "/api/v1/ai/*",
            "analytics": "/api/v1/analytics/*",
            "search": "/api/v1/search/*",
            "websocket": "/live/{meeting_id}",
        },
    }
