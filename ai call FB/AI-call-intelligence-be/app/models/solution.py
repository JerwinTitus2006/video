"""Solution ORM model - AI-generated solutions for pain points."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Solution(Base):
    """AI-generated solution for a pain point."""

    __tablename__ = "solutions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pain_point_id = Column(UUID(as_uuid=True), ForeignKey("pain_points.id", ondelete="CASCADE"), nullable=False, index=True)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=True, index=True)
    
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    priority = Column(
        Enum("high", "medium", "low", name="solution_priority"),
        default="medium",
        nullable=False,
    )
    effort = Column(
        Enum("high", "medium", "low", name="solution_effort"),
        default="medium",
        nullable=False,
    )
    expected_outcome = Column(Text, nullable=True)
    status = Column(
        Enum("proposed", "accepted", "implemented", "rejected", name="solution_status"),
        default="proposed",
        nullable=False,
    )
    confidence_score = Column(Float, default=0.8, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    pain_point = relationship("PainPoint", back_populates="solutions")
