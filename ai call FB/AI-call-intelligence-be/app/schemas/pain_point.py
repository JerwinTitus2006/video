"""Pain Point Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class PainPointCreate(BaseModel):
    meeting_id: UUID
    person_id: Optional[UUID] = None
    text: str = Field(..., min_length=1)
    label: str = Field(..., pattern="^(PROBLEM|REQUEST|COMPLAINT)$")
    timestamp_start: Optional[float] = None
    timestamp_end: Optional[float] = None
    status: str = Field(default="open", pattern="^(open|addressed|resolved)$")


class PainPointUpdate(BaseModel):
    text: Optional[str] = None
    label: Optional[str] = Field(None, pattern="^(PROBLEM|REQUEST|COMPLAINT)$")
    status: Optional[str] = Field(None, pattern="^(open|addressed|resolved)$")


class PainPointResponse(BaseModel):
    id: UUID
    meeting_id: UUID
    person_id: Optional[UUID] = None
    text: str
    label: str
    timestamp_start: Optional[float] = None
    timestamp_end: Optional[float] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PainPointListResponse(BaseModel):
    items: List[PainPointResponse]
    total: int
    page: int
    size: int
