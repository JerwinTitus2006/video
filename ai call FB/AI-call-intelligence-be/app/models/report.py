"""Report ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Report(Base):
    """Generated report (QBR, summary, etc.)."""

    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True)
    report_type = Column(
        Enum("qbr", "monthly", "weekly", "custom", name="report_type"),
        default="qbr",
        nullable=False,
    )
    title = Column(String(500), nullable=True)
    content_html = Column(Text, nullable=True)
    pdf_path = Column(Text, nullable=True)
    status = Column(
        Enum("generating", "completed", "failed", "sent", name="report_status"),
        default="generating",
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    person = relationship("Person", back_populates="reports")
