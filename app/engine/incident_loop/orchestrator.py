"""Orchestrates CAUSE and PREDICT generation for metric breaches."""
from __future__ import annotations

from uuid import uuid4

from app.engine.incident_loop.cause_generator import CauseGenerator
from app.engine.incident_loop.models import IncidentArtifacts, IncidentContext
from app.engine.incident_loop.predict_engine import PredictEngine


class IncidentOrchestrator:
    """Coordinate the autonomous incident loop after an AST rule breach."""

    def __init__(self, cause_gen: CauseGenerator, predict_gen: PredictEngine) -> None:
        self._cause_gen = cause_gen
        self._predict_gen = predict_gen

    async def handle_breach(
        self,
        context: IncidentContext,
        tier: int,
    ) -> IncidentArtifacts:
        ticket_id = f"INC-{uuid4().hex[:6].upper()}"
        cause_markdown = await self._cause_gen.generate_cause(context)
        predict_markdown = await self._predict_gen.generate_prediction(
            cause_markdown,
            tier,
        )
        return IncidentArtifacts(
            ticket_id=ticket_id,
            cause_markdown=cause_markdown,
            predict_markdown=predict_markdown,
        )
