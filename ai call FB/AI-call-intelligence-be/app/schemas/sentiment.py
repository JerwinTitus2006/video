"""Sentiment Segment Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SentimentSegmentCreate(BaseModel):
    meeting_id: UUID
    person_id: Optional[UUID] = None
    text: str = Field(..., min_length=1)
    score: float = Field(..., ge=-1.0, le=1.0)
    timestamp_start: Optional[float] = None
    timestamp_end: Optional[float] = None


class SentimentSegmentUpdate(BaseModel):
    text: Optional[str] = None
    score: Optional[float] = Field(None, ge=-1.0, le=1.0)


class SentimentSegmentResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    person_id: Optional[UUID] = None
    text: str
    score: float
    timestamp_start: Optional[float] = None
    timestamp_end: Optional[float] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SentimentSegmentListResponse(BaseModel):
    items: List[SentimentSegmentResponse]
    total: int
    page: int
    size: int
