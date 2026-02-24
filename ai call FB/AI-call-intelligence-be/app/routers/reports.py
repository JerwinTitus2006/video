"""Reports CRUD router + QBR generation endpoint."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.report import Report
from app.schemas.report import (
    QBRGenerateRequest,
    ReportCreate,
    ReportListResponse,
    ReportResponse,
    ReportUpdate,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("", response_model=ReportListResponse)
async def list_reports(
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    person_id: Optional[UUID] = None,
    report_type: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Report)
    count_query = select(func.count(Report.id))

    if person_id:
        query = query.where(Report.person_id == person_id)
        count_query = count_query.where(Report.person_id == person_id)
    if report_type:
        query = query.where(Report.report_type == report_type)
        count_query = count_query.where(Report.report_type == report_type)
    if status:
        query = query.where(Report.status == status)
        count_query = count_query.where(Report.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    query = query.order_by(Report.created_at.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    items = result.scalars().all()

    return ReportListResponse(items=items, total=total, page=page, size=size)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("", response_model=ReportResponse, status_code=201)
async def create_report(data: ReportCreate, db: AsyncSession = Depends(get_db)):
    report = Report(**data.model_dump())
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return report


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(report_id: UUID, data: ReportUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(report, key, value)

    await db.flush()
    await db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)


@router.post("/generate_qbr", response_model=ReportResponse, status_code=201)
async def generate_qbr(
    data: QBRGenerateRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Generate a Quarterly Business Review report for a person."""
    from app.services.report_service import generate_qbr_report

    # Create report record in "generating" status
    report = Report(
        person_id=data.person_id,
        report_type="qbr",
        title=f"QBR Report",
        status="generating",
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)

    # Run generation in background
    background_tasks.add_task(
        generate_qbr_report,
        report_id=str(report.id),
        person_id=str(data.person_id),
        include_meetings=data.include_meetings,
        send_email=data.send_email,
    )

    return report
