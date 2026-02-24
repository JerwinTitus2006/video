"""Resource & ResourceMatch ORM models."""

import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, DateTime, Float, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class Resource(Base):
    """A knowledge-base resource (article, FAQ, documentation)."""

    __tablename__ = "resources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)
    category = Column(String(255), nullable=True, index=True)
    embedding = Column(Vector(768), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    matches = relationship("ResourceMatch", back_populates="resource", cascade="all, delete-orphan")


class ResourceMatch(Base):
    """A match between a pain point and a resource."""

    __tablename__ = "resource_matches"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pain_point_id = Column(UUID(as_uuid=True), ForeignKey("pain_points.id", ondelete="CASCADE"), nullable=False, index=True)
    resource_id = Column(UUID(as_uuid=True), ForeignKey("resources.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    pain_point = relationship("PainPoint", back_populates="matches")
    resource = relationship("Resource", back_populates="matches")
