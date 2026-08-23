"""Pydantic models for the autonomous incident loop."""
from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict


class IncidentContext(BaseModel):
    model_config = ConfigDict(extra="forbid")

    organization_id: UUID
    breached_rule_id: str
    metric_name: str
    metric_value: float


class IncidentArtifacts(BaseModel):
    model_config = ConfigDict(extra="forbid")

    ticket_id: str
    cause_markdown: str
    predict_markdown: str
