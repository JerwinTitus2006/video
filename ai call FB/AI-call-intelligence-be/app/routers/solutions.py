"""Solutions CRUD router."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.solution import Solution
from app.schemas.solution import (
    SolutionCreate,
    SolutionListResponse,
    SolutionResponse,
    SolutionUpdate,
)

router = APIRouter(prefix="/solutions", tags=["Solutions"])


@router.get("", response_model=SolutionListResponse)
async def list_solutions(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    pain_point_id: Optional[UUID] = None,
    meeting_id: Optional[UUID] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """List solutions with pagination and filters."""
    query = select(Solution)
    count_query = select(func.count(Solution.id))

    if pain_point_id:
        query = query.where(Solution.pain_point_id == pain_point_id)
        count_query = count_query.where(Solution.pain_point_id == pain_point_id)

    if meeting_id:
        query = query.where(Solution.meeting_id == meeting_id)
        count_query = count_query.where(Solution.meeting_id == meeting_id)

    if status:
        query = query.where(Solution.status == status)
        count_query = count_query.where(Solution.status == status)

    if priority:
        query = query.where(Solution.priority == priority)
        count_query = count_query.where(Solution.priority == priority)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Solution.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return SolutionListResponse(items=items, total=total, page=page, size=size)


@router.get("/{solution_id}", response_model=SolutionResponse)
async def get_solution(solution_id: UUID, db: AsyncSession = Depends(get_db)):
    """Get a single solution by ID."""
    result = await db.execute(select(Solution).where(Solution.id == solution_id))
    solution = result.scalar_one_or_none()
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    return solution


@router.post("", response_model=SolutionResponse, status_code=201)
async def create_solution(data: SolutionCreate, db: AsyncSession = Depends(get_db)):
    """Create a new solution."""
    solution = Solution(
        pain_point_id=data.pain_point_id,
        meeting_id=data.meeting_id,
        title=data.title,
        description=data.description,
        priority=data.priority,
        effort=data.effort,
        expected_outcome=data.expected_outcome,
    )
    db.add(solution)
    await db.flush()
    await db.refresh(solution)
    return solution


@router.put("/{solution_id}", response_model=SolutionResponse)
async def update_solution(
    solution_id: UUID,
    data: SolutionUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update a solution."""
    result = await db.execute(select(Solution).where(Solution.id == solution_id))
    solution = result.scalar_one_or_none()
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(solution, key, value)

    await db.flush()
    await db.refresh(solution)
    return solution


@router.delete("/{solution_id}", status_code=204)
async def delete_solution(solution_id: UUID, db: AsyncSession = Depends(get_db)):
    """Delete a solution."""
    result = await db.execute(select(Solution).where(Solution.id == solution_id))
    solution = result.scalar_one_or_none()
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    await db.delete(solution)


@router.post("/{solution_id}/accept", response_model=SolutionResponse)
async def accept_solution(solution_id: UUID, db: AsyncSession = Depends(get_db)):
    """Mark a solution as accepted."""
    result = await db.execute(select(Solution).where(Solution.id == solution_id))
    solution = result.scalar_one_or_none()
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    solution.status = "accepted"
    await db.commit()
    await db.refresh(solution)
    return solution


@router.post("/{solution_id}/implement", response_model=SolutionResponse)
async def implement_solution(solution_id: UUID, db: AsyncSession = Depends(get_db)):
    """Mark a solution as implemented."""
    result = await db.execute(select(Solution).where(Solution.id == solution_id))
    solution = result.scalar_one_or_none()
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    solution.status = "implemented"
    await db.commit()
    await db.refresh(solution)
    return solution


@router.post("/{solution_id}/reject", response_model=SolutionResponse)
async def reject_solution(solution_id: UUID, db: AsyncSession = Depends(get_db)):
    """Mark a solution as rejected."""
    result = await db.execute(select(Solution).where(Solution.id == solution_id))
    solution = result.scalar_one_or_none()
    if not solution:
        raise HTTPException(status_code=404, detail="Solution not found")
    
    solution.status = "rejected"
    await db.commit()
    await db.refresh(solution)
    return solution
