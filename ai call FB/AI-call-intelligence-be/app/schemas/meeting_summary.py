"""Meeting Summary Pydantic schemas."""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class MeetingSummaryBase(BaseModel):
    """Base schema for meeting summary."""
    title: Optional[str] = None
    executive_summary: Optional[str] = None
    key_points: Optional[list[str]] = None
    decisions_made: Optional[list[str]] = None
    topics_discussed: Optional[list[str]] = None
    next_steps: Optional[list[str]] = None
    participants_summary: Optional[dict[str, Any]] = None


class MeetingSummaryCreate(MeetingSummaryBase):
    """Schema for creating a meeting summary."""
    meeting_id: UUID


class MeetingSummaryUpdate(MeetingSummaryBase):
    """Schema for updating a meeting summary."""
    pass


class MeetingSummaryResponse(MeetingSummaryBase):
    """Schema for meeting summary response."""
    id: UUID
    meeting_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
