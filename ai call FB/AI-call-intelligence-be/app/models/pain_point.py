"""Pain Point ORM model."""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class PainPoint(Base):
    """A detected pain point from a meeting transcript."""

    __tablename__ = "pain_points"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True)
    text = Column(Text, nullable=False)
    label = Column(
        Enum("PROBLEM", "REQUEST", "COMPLAINT", name="pain_point_label"),
        nullable=False,
    )
    embedding = Column(Vector(768), nullable=True)
    timestamp_start = Column(Float, nullable=True)
    timestamp_end = Column(Float, nullable=True)
    status = Column(
        Enum("open", "addressed", "resolved", name="pain_point_status"),
        default="open",
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    meeting = relationship("Meeting", back_populates="pain_points")
    person = relationship("Person", back_populates="pain_points")
    matches = relationship("ResourceMatch", back_populates="pain_point", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="pain_point")
    solutions = relationship("Solution", back_populates="pain_point", cascade="all, delete-orphan")
