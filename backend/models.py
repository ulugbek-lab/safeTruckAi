
from datetime import datetime, timezone
from typing import Literal

from pydantic import ConfigDict, field_serializer
from sqlmodel import Field, SQLModel
from sqlalchemy import DateTime


class IncidentBase(SQLModel):
    worker_id: int = Field(ge=0)
    violation: str = Field(
        min_length=1,
        max_length=50
    )


class Incident(IncidentBase, table=True):
    id: int | None = Field(default=None, primary_key=True)
    timestamp: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_type=DateTime(timezone=True),
    )
    status: str = Field(default="pending", max_length=20)


class IncidentCreate(IncidentBase):
    model_config = ConfigDict(extra="forbid")


class IncidentRead(IncidentBase):
    id: int
    timestamp: datetime
    status: str

    @field_serializer("timestamp")
    def serialize_timestamp(self, value: datetime) -> str:
        # Emit explicit UTC offsets; SQLite and older installations may return naive UTC.
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()


# Dashboard schemas do not change the existing database table.

ReviewStatus = Literal["pending", "reviewed", "dismissed"]
ViolationType = Literal["no_helmet", "no_vest"]


class IncidentUpdate(SQLModel):
    model_config = ConfigDict(extra="forbid")
    status: ReviewStatus


class IncidentPage(SQLModel):
    items: list[IncidentRead]
    total: int
    offset: int
    limit: int


class IncidentStatistics(SQLModel):
    total: int
    pending: int
    no_helmet: int
    no_vest: int


class DailyCount(SQLModel):
    date: str
    count: int


class ViolationCount(SQLModel):
    violation: str
    count: int


class IncidentAnalytics(SQLModel):
    timezone: str = "UTC"
    days: int
    daily: list[DailyCount]
    distribution: list[ViolationCount]
