"""Meeting Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# --------------- Create / Update ---------------

class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    jitsi_room_id: Optional[str] = None
    recording_url: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    participant_ids: Optional[List[UUID]] = []


class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    jitsi_room_id: Optional[str] = None
    recording_url: Optional[str] = None
    audio_path: Optional[str] = None
    transcript: Optional[str] = None
    status: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None


# --------------- Response ---------------

class MeetingResponse(BaseModel):
    id: UUID
    jitsi_room_id: Optional[str] = None
    title: str
    recording_url: Optional[str] = None
    audio_path: Optional[str] = None
    transcript: Optional[str] = None
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MeetingListResponse(BaseModel):
    items: List[MeetingResponse]
    total: int
    page: int
    size: int
