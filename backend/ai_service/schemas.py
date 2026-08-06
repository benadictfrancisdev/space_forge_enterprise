"""Standard AI response schema — Track 8.2."""
from __future__ import annotations

from typing import Any


def normalize_result_content(content: dict[str, Any], operation: str) -> dict[str, Any]:
    """Map operation-specific payloads into a consistent result shape."""
    summary = (
        content.get("summary")
        or content.get("headline")
        or content.get("answer")
        or content.get("note")
        or f"{operation} completed"
    )
    recommendations: list[Any] = []
    if isinstance(content.get("recommendations"), list):
        recommendations = content["recommendations"]
    elif isinstance(content.get("decisions"), list):
        recommendations = content["decisions"]
    elif isinstance(content.get("recommended_next_experiments"), list):
        recommendations = content["recommended_next_experiments"]

    warnings: list[str] = []
    if content.get("note"):
        warnings.append(str(content["note"]))
    if content.get("http_error"):
        warnings.append(f"transport_fallback: {content['http_error']}")

    confidence_raw = content.get("confidence")
    confidence = None
    if isinstance(confidence_raw, (int, float)):
        confidence = float(confidence_raw) / 100.0 if confidence_raw > 1 else float(confidence_raw)

    return {
        "summary": str(summary),
        "recommendations": recommendations,
        "warnings": warnings,
        "details": content,
        "confidence": confidence,
    }


def build_standard_response(
    *,
    operation: str,
    raw_content: dict[str, Any],
    evaluation: dict[str, Any],
    metadata: dict[str, Any] | None = None,
    model: str = "",
    latency_ms: int = 0,
    transport: str = "inline",
) -> dict[str, Any]:
    """Enterprise AI envelope returned by gateway and Django."""
    result = normalize_result_content(raw_content, operation)
    meta = dict(metadata or {})
    meta.setdefault("schema_version", "ai@v1")

    envelope = {
        "operation": operation,
        "model": model,
        "latency_ms": latency_ms,
        "evaluation": evaluation,
        "metadata": meta,
        "transport": transport,
        # Backward compatibility — flat fields except reserved envelope keys
        **{k: v for k, v in raw_content.items() if k not in ("operation", "result", "evaluation", "metadata", "model", "latency_ms", "transport")},
        "result": result,
    }
    if result.get("confidence") is not None and "confidence" not in envelope:
        envelope["confidence"] = result["confidence"]
    return envelope
