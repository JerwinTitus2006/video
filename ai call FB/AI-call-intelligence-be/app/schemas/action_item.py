"""Action Item Pydantic schemas."""

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ActionItemCreate(BaseModel):
    meeting_id: UUID
    pain_point_id: Optional[UUID] = None
    owner: Optional[str] = None
    description: str = Field(..., min_length=1)
    due_date: Optional[date] = None
    status: str = Field(default="pending", pattern="^(pending|in_progress|completed|cancelled)$")


class ActionItemUpdate(BaseModel):
    owner: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = Field(None, pattern="^(pending|in_progress|completed|cancelled)$")


class ActionItemResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    pain_point_id: Optional[UUID] = None
    owner: Optional[str] = None
    description: str
    due_date: Optional[date] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ActionItemListResponse(BaseModel):
    items: List[ActionItemResponse]
    total: int
    page: int
    size: int
