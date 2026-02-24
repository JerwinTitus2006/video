"""Action Items CRUD router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.action_item import ActionItem
from app.schemas.action_item import (
    ActionItemCreate,
    ActionItemListResponse,
    ActionItemResponse,
    ActionItemUpdate,
)

router = APIRouter(prefix="/action_items", tags=["Action Items"])


@router.get("", response_model=ActionItemListResponse)
async def list_action_items(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    meeting_id: Optional[UUID] = None,
    status: Optional[str] = None,
    owner: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(ActionItem)
    count_query = select(func.count(ActionItem.id))

    if meeting_id:
        query = query.where(ActionItem.meeting_id == meeting_id)
        count_query = count_query.where(ActionItem.meeting_id == meeting_id)
    if status:
        query = query.where(ActionItem.status == status)
        count_query = count_query.where(ActionItem.status == status)
    if owner:
        query = query.where(ActionItem.owner.ilike(f"%{owner}%"))
        count_query = count_query.where(ActionItem.owner.ilike(f"%{owner}%"))

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(ActionItem.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return ActionItemListResponse(items=items, total=total, page=page, size=size)


@router.get("/{item_id}", response_model=ActionItemResponse)
async def get_action_item(item_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ActionItem).where(ActionItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    return item


@router.post("", response_model=ActionItemResponse, status_code=201)
async def create_action_item(data: ActionItemCreate, db: AsyncSession = Depends(get_db)):
    item = ActionItem(**data.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)
    return item


@router.put("/{item_id}", response_model=ActionItemResponse)
async def update_action_item(item_id: UUID, data: ActionItemUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ActionItem).where(ActionItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(item, key, value)

    await db.flush()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
async def delete_action_item(item_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(ActionItem).where(ActionItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    await db.delete(item)
