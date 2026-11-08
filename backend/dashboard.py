"""Read-only dashboard aggregates and validated incident review.

Keep the original list response intact for existing Phase 4 consumers.
All date buckets are UTC, independent of the PostgreSQL session timezone.
"""
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func
from sqlmodel import Session, select

from backend.database import get_session
from backend.models import (
    DailyCount, Incident, IncidentAnalytics, IncidentPage, IncidentRead,
    IncidentStatistics, IncidentUpdate, ReviewStatus, ViolationCount, ViolationType,
)

router = APIRouter(prefix="/api")
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/dashboard/incidents", response_model=IncidentPage)
def list_incidents(
    session: SessionDep,
    offset: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    violation: ViolationType | None = None,
    status: ReviewStatus | None = None,
    sort: Literal["newest", "oldest"] = "newest",
):
    filters = []
    if violation is not None:
        filters.append(Incident.violation == violation)
    if status is not None:
        filters.append(Incident.status == status)
    total = session.exec(select(func.count()).select_from(Incident).where(*filters)).one()
    ordering = (Incident.timestamp.desc(), Incident.id.desc()) if sort == "newest" else (
        Incident.timestamp.asc(), Incident.id.asc()
    )
    items = session.exec(select(Incident).where(*filters).order_by(*ordering).offset(offset).limit(limit)).all()
    return IncidentPage(items=items, total=total, offset=offset, limit=limit)


@router.get("/dashboard/statistics", response_model=IncidentStatistics)
def statistics(session: SessionDep):
    # SQL aggregates cover the entire table, independent of pagination and filters.
    total, pending, helmet, vest = session.exec(select(
        func.count(Incident.id),
        func.coalesce(func.sum(case((Incident.status == "pending", 1), else_=0)), 0),
        func.coalesce(func.sum(case((Incident.violation == "no_helmet", 1), else_=0)), 0),
        func.coalesce(func.sum(case((Incident.violation == "no_vest", 1), else_=0)), 0),
    )).one()
    return IncidentStatistics(total=total, pending=pending, no_helmet=helmet, no_vest=vest)


@router.get("/dashboard/analytics", response_model=IncidentAnalytics)
def analytics(session: SessionDep, days: int = Query(14, ge=1, le=90)):
    today = datetime.now(timezone.utc).date()
    start = today - timedelta(days=days - 1)
    start_time = datetime.combine(start, datetime.min.time(), tzinfo=timezone.utc)
    end_time = datetime.combine(today + timedelta(days=1), datetime.min.time(), tzinfo=timezone.utc)
    # PostgreSQL timestamptz date casts otherwise use the session timezone.
    stamp = func.timezone("UTC", Incident.timestamp) if session.get_bind().dialect.name == "postgresql" else Incident.timestamp
    date_bucket = func.date(stamp)
    rows = session.exec(select(date_bucket, func.count(Incident.id)).where(
        Incident.timestamp >= start_time, Incident.timestamp < end_time,
    ).group_by(date_bucket).order_by(date_bucket)).all()
    counts = {str(day): count for day, count in rows}
    distribution = session.exec(select(Incident.violation, func.count(Incident.id))
        .group_by(Incident.violation).order_by(Incident.violation)).all()
    return IncidentAnalytics(
        days=days,
        daily=[DailyCount(date=(start + timedelta(days=i)).isoformat(),
                         count=counts.get((start + timedelta(days=i)).isoformat(), 0))
               for i in range(days)],
        distribution=[ViolationCount(violation=violation, count=count) for violation, count in distribution],
    )


@router.patch("/incidents/{incident_id}", response_model=IncidentRead)
def review_incident(incident_id: int, data: IncidentUpdate, session: SessionDep):
    incident = session.get(Incident, incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    incident.status = data.status
    session.add(incident)
    session.commit()
    session.refresh(incident)
    return incident
