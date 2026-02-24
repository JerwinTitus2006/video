"""Sentiment Segment ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class SentimentSegment(Base):
    """Per-speaker sentiment score for a segment of a meeting."""

    __tablename__ = "sentiment_segments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    person_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True)
    text = Column(Text, nullable=False)
    score = Column(Float, nullable=False)  # -1.0 (negative) to +1.0 (positive)
    timestamp_start = Column(Float, nullable=True)
    timestamp_end = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    meeting = relationship("Meeting", back_populates="sentiment_segments")
    person = relationship("Person", back_populates="sentiment_segments")
