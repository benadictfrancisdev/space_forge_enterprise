"""Enterprise AI engines — embeddings, guardrails, hallucination detection."""
from __future__ import annotations

import hashlib
import math
import re
from typing import Any


def deterministic_embed(text: str, dims: int = 64) -> list[float]:
    """Lightweight deterministic embedding (no external model required)."""
    vec = [0.0] * dims
    tokens = re.findall(r"\w+", (text or "").lower())
    if not tokens:
        return vec
    for token in tokens:
        h = int(hashlib.md5(token.encode()).hexdigest(), 16)
        idx = h % dims
        vec[idx] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [round(v / norm, 6) for v in vec]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    if na == 0 or nb == 0:
        return 0.0
    return round(dot / (na * nb), 6)


def run_guardrails(
    policies: list,
    verified_context: dict,
    quality_score: float | None,
) -> tuple[bool, list[str]]:
    violations = []
    min_quality = 50.0
    for policy in policies:
        for rule in policy.rules or []:
            rtype = rule.get("type")
            if rtype == "min_quality_score":
                min_quality = float(rule.get("value", min_quality))
            elif rtype == "require_intelligence_context" and not verified_context.get("intelligence"):
                violations.append("Missing intelligence context bundle")
            elif rtype == "require_analytics" and not verified_context.get("analytics"):
                violations.append("Missing analytics results")

    if quality_score is not None and quality_score < min_quality:
        violations.append(f"Quality score {quality_score} below {min_quality}")

    if not verified_context.get("intelligence"):
        violations.append("Intelligence context required before AI reasoning")

    return len(violations) == 0, violations


def detect_hallucination(
    ai_text: str,
    verified_facts: dict,
) -> dict[str, Any]:
    """Compare numeric claims in AI output against verified platform facts."""
    numbers_in_ai = re.findall(r"\b\d+(?:\.\d+)?\b", ai_text or "")
    verified_numbers: list[float] = []

    for kpi in verified_facts.get("kpis") or []:
        if isinstance(kpi, dict) and kpi.get("value") is not None:
            verified_numbers.append(float(kpi["value"]))
    quality = verified_facts.get("quality_score")
    if quality is not None:
        verified_numbers.append(float(quality))
    for op_result in (verified_facts.get("analytics") or {}).values():
        if isinstance(op_result, dict):
            for key in ("row_count", "column_count", "overall_score"):
                if op_result.get(key) is not None:
                    verified_numbers.append(float(op_result[key]))

    mismatches = []
    for num_str in numbers_in_ai[:20]:
        num = float(num_str)
        if num > 1000000:
            continue
        if verified_numbers and not any(abs(num - v) < max(1.0, abs(v) * 0.15) for v in verified_numbers):
            mismatches.append(num)

    score = 0.0
    if numbers_in_ai:
        score = round(len(mismatches) / len(numbers_in_ai[:20]), 4)
    return {
        "hallucination_score": score,
        "mismatched_numbers": mismatches[:10],
        "verified_number_count": len(verified_numbers),
        "flagged": score > 0.5,
    }


def build_verified_context_payload(context_bundle: dict, extra: dict) -> dict:
    return {
        "verified_facts": {
            "row_count": context_bundle.get("row_count"),
            "columns": context_bundle.get("columns"),
            "quality_score": context_bundle.get("quality_score"),
            "metrics": context_bundle.get("metrics"),
            "kpis": extra.get("kpis"),
            "analytics": extra.get("analytics_summary"),
        },
        "intelligence": context_bundle,
        "reasoning_mode": "verified_outputs_only",
    }
