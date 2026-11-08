
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlmodel import Session, select

from backend.database import (
    create_db_and_tables,
    get_session
)
from backend.models import (
    Incident,
    IncidentCreate,
    IncidentRead
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="SafeTruck AI API",
    description="Workplace safety incident monitoring API",
    version="1.0.0",
    lifespan=lifespan
)

SessionDep = Annotated[Session, Depends(get_session)]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post(
    "/api/incidents",
    response_model=IncidentRead,
    status_code=201
)
def create_incident(
    data: IncidentCreate,
    session: SessionDep
):
    if data.violation not in {"no_helmet", "no_vest"}:
        raise HTTPException(
            status_code=422,
            detail="Unsupported violation type"
        )

    incident = Incident.model_validate(data)

    session.add(incident)
    session.commit()
    session.refresh(incident)

    return incident


@app.get(
    "/api/incidents",
    response_model=list[IncidentRead]
)
def get_incidents(
    session: SessionDep,
    limit: int = Query(default=50, ge=1, le=100)
):
    statement = (
        select(Incident)
        .order_by(Incident.id.desc())
        .limit(limit)
    )

    return session.exec(statement).all()


@app.get(
    "/api/incidents/{incident_id}",
    response_model=IncidentRead
)
def get_incident(
    incident_id: int,
    session: SessionDep
):
    incident = session.get(Incident, incident_id)

    if not incident:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )

    return incident
