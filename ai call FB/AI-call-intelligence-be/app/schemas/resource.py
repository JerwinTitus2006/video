"""Resource & ResourceMatch Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# --------------- Resource ---------------

class ResourceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


class ResourceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None


class ResourceResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ResourceListResponse(BaseModel):
    items: List[ResourceResponse]
    total: int
    page: int
    size: int


# --------------- ResourceMatch ---------------

class ResourceMatchResponse(BaseModel):
    id: UUID
    pain_point_id: UUID
    resource_id: UUID
    score: float
    explanation: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
