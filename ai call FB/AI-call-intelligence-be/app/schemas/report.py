"""Report Pydantic schemas."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    person_id: Optional[UUID] = None
    report_type: str = Field(default="qbr", pattern="^(qbr|monthly|weekly|custom)$")
    title: Optional[str] = None


class ReportUpdate(BaseModel):
    title: Optional[str] = None
    content_html: Optional[str] = None
    pdf_path: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(generating|completed|failed|sent)$")


class ReportResponse(BaseModel):
    id: UUID
    person_id: Optional[UUID] = None
    report_type: str
    title: Optional[str] = None
    content_html: Optional[str] = None
    pdf_path: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReportListResponse(BaseModel):
    items: List[ReportResponse]
    total: int
    page: int
    size: int


# --------------- QBR Generation Request ---------------

class QBRGenerateRequest(BaseModel):
    person_id: UUID
    include_meetings: Optional[int] = Field(default=5, description="Number of recent meetings to include")
    send_email: bool = Field(default=False)
