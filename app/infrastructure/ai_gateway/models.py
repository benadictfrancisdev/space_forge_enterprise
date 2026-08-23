"""Pydantic models for the AI gateway."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TaskType = Literal["chat_to_rule", "incident_predict"]


class GatewayRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: str
    tier: int = Field(ge=1, le=3)
    task_type: TaskType


class GatewayResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str
    model_used: str
    cached: bool
