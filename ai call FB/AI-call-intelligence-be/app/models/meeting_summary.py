"""Meeting Summary ORM model - AI-generated meeting summaries."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class MeetingSummary(Base):
    """AI-generated summary for a meeting."""

    __tablename__ = "meeting_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    title = Column(String(500), nullable=True)
    executive_summary = Column(Text, nullable=True)
    key_points = Column(JSON, nullable=True)  # List of strings
    decisions_made = Column(JSON, nullable=True)  # List of strings
    topics_discussed = Column(JSON, nullable=True)  # List of strings
    next_steps = Column(JSON, nullable=True)  # List of strings
    participants_summary = Column(JSON, nullable=True)  # Dict with participant info
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
