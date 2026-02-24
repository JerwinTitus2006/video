"""Persons CRUD router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.person import Person
from app.schemas.person import (
    PersonCreate,
    PersonListResponse,
    PersonResponse,
    PersonUpdate,
)

router = APIRouter(prefix="/persons", tags=["Persons"])


@router.get("", response_model=PersonListResponse)
async def list_persons(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List persons with pagination and optional role filter."""
    query = select(Person)
    count_query = select(func.count(Person.id))

    if role:
        query = query.where(Person.role == role)
        count_query = count_query.where(Person.role == role)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Person.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return PersonListResponse(items=items, total=total, page=page, size=size)


@router.get("/{person_id}", response_model=PersonResponse)
async def get_person(person_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single person by ID."""
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    return person


@router.post("", response_model=PersonResponse, status_code=201)
async def create_person(data: PersonCreate, db: AsyncSession = Depends(get_db)):
    """Create a new person."""
    person = Person(name=data.name, email=data.email, role=data.role)
    db.add(person)
    await db.flush()
    await db.refresh(person)
    return person


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(person_id: UUID, data: PersonUpdate, db: AsyncSession = Depends(get_db)):
    """Update a person."""
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(person, key, value)

    await db.flush()
    await db.refresh(person)
    return person


@router.delete("/{person_id}", status_code=204)
async def delete_person(person_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a person."""
    result = await db.execute(select(Person).where(Person.id == person_id))
    person = result.scalar_one_or_none()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    await db.delete(person)
