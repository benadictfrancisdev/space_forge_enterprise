"""Register all AI operations — Track 5.3."""
from __future__ import annotations

from ai_service import engines
from ai_service.registry import REGISTRY

_REGISTRATIONS = [
    ("chat", engines.compute_chat, "Natural language Q&A over dataset profile", 0.62),
    ("forecast", engines.compute_forecast, "Heuristic / model forecast", 0.5),
    ("scientist", engines.compute_scientist, "Exploratory data scientist pass", 0.58),
    ("hypothesis", engines.compute_hypothesis, "Hypothesis framing", 0.4),
    ("nlp", engines.compute_nlp, "NL intent and SQL sketch", 0.5),
    ("narrative", engines.compute_narrative, "Executive narrative", 0.58),
    ("anomaly", engines.compute_anomaly, "Profile anomaly detection", 0.55),
    ("decisions", engines.compute_decisions, "Decision feed generation", 0.55),
    ("indian-intel", engines.compute_indian_intel, "Indian business intel modules", 0.55),
]


def ensure_registered() -> None:
    if REGISTRY.list_operations():
        return
    for name, handler, description, confidence in _REGISTRATIONS:
        REGISTRY.register(
            name,
            handler,
            description=description,
            default_confidence=confidence,
        )


ensure_registered()
