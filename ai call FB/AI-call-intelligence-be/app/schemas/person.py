"""Person Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class PersonCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = None
    role: str = Field(default="unknown", pattern="^(vendor|distributor|unknown)$")


class PersonUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = None
    role: Optional[str] = Field(None, pattern="^(vendor|distributor|unknown)$")
    health_score: Optional[float] = None


class PersonResponse(BaseModel):
    id: UUID
    name: str
    email: Optional[str] = None
    role: str
    health_score: float
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PersonListResponse(BaseModel):
    items: List[PersonResponse]
    total: int
    page: int
    size: int
