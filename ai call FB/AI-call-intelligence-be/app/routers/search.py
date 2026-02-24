"""Search & filtering router."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import or_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.meeting import Meeting
from app.models.pain_point import PainPoint
from app.models.resource import Resource, ResourceMatch
from app.schemas.meeting import MeetingResponse
from app.schemas.pain_point import PainPointResponse
from app.schemas.resource import ResourceResponse

router = APIRouter(prefix="/search", tags=["Search"])


class SearchResults(BaseModel):
    meetings: List[MeetingResponse] = []
    pain_points: List[PainPointResponse] = []
    resources: List[ResourceResponse] = []


class VectorSearchResult(BaseModel):
    resource_id: UUID
    title: str
    score: float
    category: Optional[str] = None


@router.get("/full_text", response_model=SearchResults)
async def full_text_search(
    q: str = Query(..., min_length=1, description="Search query"),
    entity: Optional[str] = Query(None, description="Limit to: meetings, pain_points, resources"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """
    Full-text search across meetings, pain_points, and resources.
    Uses PostgreSQL ILIKE for simplicity (can be upgraded to tsvector).
    """
    from sqlalchemy import select, func

    results = SearchResults()
    pattern = f"%{q}%"

    if entity is None or entity == "meetings":
        query = (
            select(Meeting)
            .where(or_(Meeting.title.ilike(pattern), Meeting.transcript.ilike(pattern)))
            .limit(limit)
        )
        res = await db.execute(query)
        results.meetings = list(res.scalars().all())

    if entity is None or entity == "pain_points":
        query = (
            select(PainPoint)
            .where(PainPoint.text.ilike(pattern))
            .limit(limit)
        )
        res = await db.execute(query)
        results.pain_points = list(res.scalars().all())

    if entity is None or entity == "resources":
        query = (
            select(Resource)
            .where(or_(Resource.title.ilike(pattern), Resource.description.ilike(pattern), Resource.content.ilike(pattern)))
            .limit(limit)
        )
        res = await db.execute(query)
        results.resources = list(res.scalars().all())

    return results


@router.get("/vector_similarity", response_model=List[VectorSearchResult])
async def vector_similarity_search(
    pain_point_id: UUID = Query(..., description="Pain point ID to find similar resources"),
    top_k: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
):
    """
    Vector similarity search: find resources most similar to a pain point's embedding.
    Uses pgvector cosine distance operator <=> for fast nearest-neighbor lookup.
    """
    from sqlalchemy import select

    # Get the pain point embedding
    pp_result = await db.execute(select(PainPoint).where(PainPoint.id == pain_point_id))
    pain_point = pp_result.scalar_one_or_none()

    if not pain_point or pain_point.embedding is None:
        return []

    # Use pgvector cosine distance for similarity
    query = text("""
        SELECT id, title, category,
               1 - (embedding <=> :embedding) AS score
        FROM resources
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> :embedding
        LIMIT :limit
    """)

    result = await db.execute(query, {
        "embedding": str(list(pain_point.embedding)),
        "limit": top_k,
    })

    return [
        VectorSearchResult(
            resource_id=row.id,
            title=row.title,
            score=round(row.score, 4),
            category=row.category,
        )
        for row in result
    ]


@router.get("/filtered")
async def filtered_search(
    start_date: Optional[str] = Query(None, description="Start date (ISO format)"),
    end_date: Optional[str] = Query(None, description="End date (ISO format)"),
    person_id: Optional[UUID] = None,
    status: Optional[str] = None,
    label: Optional[str] = None,
    entity: str = Query("meetings", description="Entity: meetings, pain_points, action_items"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Date range, person, status, and label filters for various entities."""
    from datetime import datetime
    from sqlalchemy import select, func
    from app.models.action_item import ActionItem

    if entity == "meetings":
        query = select(Meeting)
        if start_date:
            query = query.where(Meeting.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.where(Meeting.created_at <= datetime.fromisoformat(end_date))
        if status:
            query = query.where(Meeting.status == status)
        query = query.order_by(Meeting.created_at.desc()).offset((page - 1) * size).limit(size)
        result = await db.execute(query)
        return [MeetingResponse.model_validate(m) for m in result.scalars().all()]

    elif entity == "pain_points":
        query = select(PainPoint)
        if start_date:
            query = query.where(PainPoint.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.where(PainPoint.created_at <= datetime.fromisoformat(end_date))
        if person_id:
            query = query.where(PainPoint.person_id == person_id)
        if label:
            query = query.where(PainPoint.label == label)
        if status:
            query = query.where(PainPoint.status == status)
        query = query.order_by(PainPoint.created_at.desc()).offset((page - 1) * size).limit(size)
        result = await db.execute(query)
        return [PainPointResponse.model_validate(pp) for pp in result.scalars().all()]

    elif entity == "action_items":
        from app.schemas.action_item import ActionItemResponse
        query = select(ActionItem)
        if start_date:
            query = query.where(ActionItem.created_at >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.where(ActionItem.created_at <= datetime.fromisoformat(end_date))
        if status:
            query = query.where(ActionItem.status == status)
        query = query.order_by(ActionItem.created_at.desc()).offset((page - 1) * size).limit(size)
        result = await db.execute(query)
        return [ActionItemResponse.model_validate(ai) for ai in result.scalars().all()]

    return []
