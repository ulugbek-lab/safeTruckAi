
from datetime import datetime, timezone

from pydantic import ConfigDict
from sqlmodel import Field, SQLModel


class IncidentBase(SQLModel):
    worker_id: int = Field(ge=0)
    violation: str = Field(
        min_length=1,
        max_length=50
    )


class Incident(IncidentBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    status: str = Field(default="pending", max_length=20)


class IncidentCreate(IncidentBase):
    model_config = ConfigDict(extra="forbid")


class IncidentRead(IncidentBase):
    id: int
    timestamp: datetime
    status: str
