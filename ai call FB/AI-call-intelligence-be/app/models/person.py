"""Person ORM model."""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, Enum, Float, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Person(Base):
    """Represents a vendor or distributor person identified by voice."""

    __tablename__ = "persons"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=True, unique=True)
    role = Column(
        Enum("vendor", "distributor", "unknown", name="person_role"),
        default="unknown",
        nullable=False,
    )
    voice_embedding = Column(Vector(512), nullable=True)
    health_score = Column(Float, default=50.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    meetings = relationship("Meeting", secondary="meeting_persons", back_populates="participants")
    pain_points = relationship("PainPoint", back_populates="person")
    sentiment_segments = relationship("SentimentSegment", back_populates="person")
    reports = relationship("Report", back_populates="person")
