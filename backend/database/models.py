from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime
import uuid

Base = declarative_base()


def generate_uuid():
    return str(uuid.uuid4())


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(String, primary_key=True, default=generate_uuid)
    room_code = Column(String, unique=True, nullable=False, index=True)
    title = Column(String)
    host_name = Column(String, nullable=True)          # creator / host display name
    host_sid = Column(String, nullable=True)            # socket id of the host (set on join)
    scheduled_at = Column(DateTime, nullable=True)      # if scheduled for later
    require_admission = Column(Integer, default=1)      # 1 = host must admit, 0 = auto-join
    started_at = Column(DateTime, nullable=True)          # set when host joins
    ended_at = Column(DateTime, nullable=True)
    status = Column(String, default="waiting")          # waiting, live, ended
    participant_count = Column(Integer, default=0)
    duration_minutes = Column(Integer, nullable=True)
    recording_filename = Column(String, nullable=True)   # stored recording file name

    # Relationships
    transcripts = relationship(
        "Transcript", back_populates="meeting", cascade="all, delete-orphan"
    )
    pain_points = relationship(
        "PainPoint", back_populates="meeting", cascade="all, delete-orphan"
    )
    action_items = relationship(
        "ActionItem", back_populates="meeting", cascade="all, delete-orphan"
    )
    sentiment = relationship(
        "SentimentAnalysis",
        back_populates="meeting",
        uselist=False,
        cascade="all, delete-orphan",
    )


class Transcript(Base):
    __tablename__ = "transcripts"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    speaker_id = Column(String)
    speaker_name = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    timestamp_seconds = Column(Float)
    confidence = Column(Float, default=0.9)
    language = Column(String, default="en-IN")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    meeting = relationship("Meeting", back_populates="transcripts")
    pain_points = relationship("PainPoint", back_populates="transcript")


class PainPoint(Base):
    __tablename__ = "pain_points"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    transcript_id = Column(
        String, ForeignKey("transcripts.id", ondelete="SET NULL"), nullable=True
    )
    issue_text = Column(Text, nullable=False)
    category = Column(String)  # delivery, pricing, quality, availability, service, other
    severity = Column(String)  # low, medium, high, critical
    context = Column(Text)
    status = Column(String, default="open")  # open, resolved, ignored
    extracted_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    meeting = relationship("Meeting", back_populates="pain_points")
    transcript = relationship("Transcript", back_populates="pain_points")
    solutions = relationship(
        "Solution", back_populates="pain_point", cascade="all, delete-orphan"
    )


class SentimentAnalysis(Base):
    __tablename__ = "sentiment_analysis"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    overall_sentiment = Column(String)  # positive, neutral, negative
    sentiment_score = Column(Float)  # 0-100
    distributor_satisfaction = Column(Float)  # 0-100
    manufacturer_sentiment = Column(Float, nullable=True)
    key_emotions = Column(JSON, default=list)
    confidence = Column(Float, default=0.8)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    meeting = relationship("Meeting", back_populates="sentiment")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(String, primary_key=True, default=generate_uuid)
    meeting_id = Column(
        String,
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_description = Column(Text, nullable=False)
    assigned_to = Column(String)
    priority = Column(String, default="medium")  # low, medium, high, urgent
    status = Column(String, default="pending")  # pending, in_progress, completed, cancelled
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    meeting = relationship("Meeting", back_populates="action_items")


class Solution(Base):
    __tablename__ = "solutions"

    id = Column(String, primary_key=True, default=generate_uuid)
    pain_point_id = Column(
        String, ForeignKey("pain_points.id", ondelete="CASCADE"), nullable=False
    )
    solution_text = Column(Text, nullable=False)
    implementation_steps = Column(JSON, default=list)
    priority_rank = Column(Integer, nullable=True)
    feasibility_score = Column(Float, nullable=True)
    estimated_impact = Column(String, default="medium")  # low, medium, high
    generated_by = Column(String, default="ai")  # ai, manual
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    pain_point = relationship("PainPoint", back_populates="solutions")
