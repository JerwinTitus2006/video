"""Pain Points CRUD router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.pain_point import PainPoint
from app.schemas.pain_point import (
    PainPointCreate,
    PainPointListResponse,
    PainPointResponse,
    PainPointUpdate,
)

router = APIRouter(prefix="/pain_points", tags=["Pain Points"])


@router.get("", response_model=PainPointListResponse)
async def list_pain_points(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    meeting_id: Optional[UUID] = None,
    person_id: Optional[UUID] = None,
    label: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List pain points with filtering."""
    query = select(PainPoint)
    count_query = select(func.count(PainPoint.id))

    if meeting_id:
        query = query.where(PainPoint.meeting_id == meeting_id)
        count_query = count_query.where(PainPoint.meeting_id == meeting_id)
    if person_id:
        query = query.where(PainPoint.person_id == person_id)
        count_query = count_query.where(PainPoint.person_id == person_id)
    if label:
        query = query.where(PainPoint.label == label)
        count_query = count_query.where(PainPoint.label == label)
    if status:
        query = query.where(PainPoint.status == status)
        count_query = count_query.where(PainPoint.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(PainPoint.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PainPointListResponse(items=items, total=total, page=page, size=size)


@router.get("/{pain_point_id}", response_model=PainPointResponse)
async def get_pain_point(pain_point_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PainPoint).where(PainPoint.id == pain_point_id))
    pp = result.scalar_one_or_none()
    if not pp:
        raise HTTPException(status_code=404, detail="Pain point not found")
    return pp


@router.post("", response_model=PainPointResponse, status_code=201)
async def create_pain_point(data: PainPointCreate, db: AsyncSession = Depends(get_db)):
    pp = PainPoint(**data.model_dump())
    db.add(pp)
    await db.flush()
    await db.refresh(pp)
    return pp


@router.put("/{pain_point_id}", response_model=PainPointResponse)
async def update_pain_point(pain_point_id: UUID, data: PainPointUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PainPoint).where(PainPoint.id == pain_point_id))
    pp = result.scalar_one_or_none()
    if not pp:
        raise HTTPException(status_code=404, detail="Pain point not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(pp, key, value)

    await db.flush()
    await db.refresh(pp)
    return pp


@router.delete("/{pain_point_id}", status_code=204)
async def delete_pain_point(pain_point_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(PainPoint).where(PainPoint.id == pain_point_id))
    pp = result.scalar_one_or_none()
    if not pp:
        raise HTTPException(status_code=404, detail="Pain point not found")
    await db.delete(pp)
