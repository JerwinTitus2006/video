"""Action Item ORM model."""

import uuid
from datetime import date, datetime

from sqlalchemy import Column, Date, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ActionItem(Base):
    """A generated action item linked to a meeting and/or pain point."""

    __tablename__ = "action_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id = Column(UUID(as_uuid=True), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False, index=True)
    pain_point_id = Column(UUID(as_uuid=True), ForeignKey("pain_points.id", ondelete="SET NULL"), nullable=True, index=True)
    owner = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)
    due_date = Column(Date, nullable=True)
    status = Column(
        Enum("pending", "in_progress", "completed", "cancelled", name="action_status"),
        default="pending",
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    meeting = relationship("Meeting", back_populates="action_items")
    pain_point = relationship("PainPoint", back_populates="action_items")
