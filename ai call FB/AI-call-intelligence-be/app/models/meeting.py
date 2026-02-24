"""Meeting ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, ForeignKey, String, Table, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base

# Association table for many-to-many: meetings <-> persons
meeting_persons = Table(
    "meeting_persons",
    Base.metadata,
    Column("meeting_id", UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column("person_id", UUID(as_uuid=True), ForeignKey("persons.id", ondelete="CASCADE"), primary_key=True),
)


class Meeting(Base):
    """Represents a recorded meeting / call."""

    __tablename__ = "meetings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    jitsi_room_id = Column(String(255), nullable=True, index=True)
    title = Column(String(500), nullable=False)
    recording_url = Column(Text, nullable=True)
    audio_path = Column(Text, nullable=True)
    transcript = Column(Text, nullable=True)
    status = Column(
        Enum("pending", "processing", "completed", "failed", name="meeting_status"),
        default="pending",
        nullable=False,
    )
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    participants = relationship("Person", secondary=meeting_persons, back_populates="meetings")
    pain_points = relationship("PainPoint", back_populates="meeting", cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    sentiment_segments = relationship("SentimentSegment", back_populates="meeting", cascade="all, delete-orphan")
