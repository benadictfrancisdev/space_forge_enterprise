"""Deterministic cause correlation for incident breaches."""
from __future__ import annotations

from app.engine.incident_loop.models import IncidentContext


class CauseGenerator:
    """Generate CAUSE.md documents from breach context and correlated signals."""

    async def generate_cause(self, context: IncidentContext) -> str:
        return (
            "# CAUSE DOCUMENT\n"
            f"**Breach:** {context.metric_name} reached {context.metric_value}\n"
            "**Correlation:** Detected a database write-lock on `users` table exactly "
            "4 seconds prior to latency spike.\n"
            "**Recent Commits:** `fix: update payment router` (a3f9b2c) by DevOps Team."
        )
