"""Solution Pydantic schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class SolutionBase(BaseModel):
    """Base schema for solution."""
    title: str
    description: str
    priority: str = "medium"
    effort: str = "medium"
    expected_outcome: Optional[str] = None


class SolutionCreate(SolutionBase):
    """Schema for creating a solution."""
    pain_point_id: UUID
    meeting_id: Optional[UUID] = None


class SolutionUpdate(BaseModel):
    """Schema for updating a solution."""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    effort: Optional[str] = None
    expected_outcome: Optional[str] = None
    status: Optional[str] = None


class SolutionResponse(SolutionBase):
    """Schema for solution response."""
    id: UUID
    pain_point_id: UUID
    meeting_id: Optional[UUID]
    status: str
    confidence_score: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SolutionListResponse(BaseModel):
    """Paginated list of solutions."""
    items: list[SolutionResponse]
    total: int
    page: int
    size: int
