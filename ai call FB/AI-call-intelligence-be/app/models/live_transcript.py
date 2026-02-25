"""Live Transcript Segment ORM model - For real-time transcription."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text, Boolean, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class LiveTranscriptSegment(Base):
    """Real-time transcript segment during a live meeting."""

    __tablename__ = "live_transcript_segments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    
    speaker = Column(String(255), nullable=True)
    speaker_id = Column(UUID(as_uuid=True), ForeignKey("persons.id", ondelete="SET NULL"), nullable=True, index=True)
    text = Column(Text, nullable=False)
    
    timestamp_start = Column(Float, nullable=True)
    timestamp_end = Column(Float, nullable=True)
    
    # Real-time analysis results
    sentiment_score = Column(Float, nullable=True)  # -1.0 to 1.0
    is_pain_point = Column(Boolean, default=False, nullable=False)
    pain_point_label = Column(String(50), nullable=True)  # PROBLEM, REQUEST, COMPLAINT
    
    # Metadata
    confidence = Column(Float, default=1.0, nullable=False)
    language = Column(String(10), default="en", nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
