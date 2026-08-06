"""SpaceForge AI compute engines — Track 5 (no DB, no auth)."""
from __future__ import annotations

from typing import Any


def _cols(profile: dict[str, Any]) -> list[str]:
    schema = profile.get("schema") or {}
    columns = schema.get("columns") or []
    names = []
    for c in columns:
        if isinstance(c, dict) and c.get("name"):
            names.append(str(c["name"]))
        elif isinstance(c, str):
            names.append(c)
    if not names:
        stats = (profile.get("statistics") or {}).get("columns") or {}
        names = list(stats.keys())
    return names


def _row_count(profile: dict[str, Any]) -> int:
    return int(profile.get("row_count") or (profile.get("statistics") or {}).get("row_count") or 0)


def compute_chat(payload: dict[str, Any]) -> dict[str, Any]:
    question = str(payload.get("question") or payload.get("message") or "").strip()
    profile = payload.get("profile") or {}
    cols = _cols(profile)
    rows = _row_count(profile)
    answer = (
        f"Based on the profiled dataset ({rows:,} rows, {len(cols)} columns"
        f"{': ' + ', '.join(cols[:8]) if cols else ''}), "
    )
    if question:
        answer += f"regarding “{question}”: focus on distributions and null rates in the profile statistics. "
    else:
        answer += "ask a specific metric or segment question for a sharper answer. "
    answer += "This response is produced by SpaceForge heuristic compute (Track 5); wire an LLM provider later."
    return {
        "answer": answer,
        "headline": "Dataset Q&A (heuristic)",
        "confidence": 62,
        "columns_referenced": cols[:10],
        "row_count": rows,
    }


def compute_forecast(payload: dict[str, Any]) -> dict[str, Any]:
    profile = payload.get("profile") or {}
    stats = (profile.get("statistics") or {}).get("columns") or {}
    numeric = [
        name
        for name, meta in stats.items()
        if isinstance(meta, dict) and meta.get("dtype") == "number"
    ]
    target = payload.get("target_column") or (numeric[0] if numeric else None)
    horizon = int(payload.get("horizon") or 7)
    series = []
    base = 100.0
    if target and isinstance(stats.get(target), dict):
        mean = stats[target].get("mean")
        if isinstance(mean, (int, float)):
            base = float(mean)
    for i in range(1, horizon + 1):
        series.append({"period": i, "value": round(base * (1 + 0.01 * i), 4)})
    return {
        "target_column": target,
        "horizon": horizon,
        "method": "heuristic_trend_v1",
        "forecast": series,
        "note": "Placeholder forecast from column mean; replace with model in later AI hardening.",
    }


def compute_scientist(payload: dict[str, Any]) -> dict[str, Any]:
    profile = payload.get("profile") or {}
    cols = _cols(profile)
    stats = (profile.get("statistics") or {}).get("columns") or {}
    findings = []
    for name, meta in list(stats.items())[:5]:
        if not isinstance(meta, dict):
            continue
        null_pct = meta.get("null_pct", 0)
        findings.append(
            {
                "column": name,
                "dtype": meta.get("dtype"),
                "null_pct": null_pct,
                "insight": f"{name} has {null_pct}% nulls and {meta.get('unique_count', '?')} unique values.",
            }
        )
    return {
        "summary": f"Scientist pass over {len(cols)} columns.",
        "findings": findings,
        "recommended_next_experiments": [
            "Correlation scan across numeric columns",
            "Segment comparison on top categorical field",
            "Anomaly thresholds on high-variance metrics",
        ],
    }


def compute_hypothesis(payload: dict[str, Any]) -> dict[str, Any]:
    hypothesis = str(payload.get("hypothesis") or payload.get("question") or "Metric differs by segment")
    return {
        "hypothesis": hypothesis,
        "status": "evaluated_heuristic",
        "result": "insufficient_causal_claim",
        "explanation": "Heuristic engine cannot prove causality; use profile statistics to design a proper test.",
        "suggested_test": "two_sample_t_test_or_chi_square",
        "confidence": 40,
    }


def compute_nlp(payload: dict[str, Any]) -> dict[str, Any]:
    query = str(payload.get("query") or payload.get("question") or "")
    profile = payload.get("profile") or {}
    cols = _cols(profile)
    matched = [c for c in cols if c.lower() in query.lower()] if query else cols[:3]
    return {
        "query": query,
        "intent": "describe" if not query else "filter_or_aggregate",
        "matched_columns": matched or cols[:3],
        "sql_sketch": f"SELECT {', '.join((matched or cols)[:3]) or '*'} FROM dataset LIMIT 100",
        "note": "NL→SQL sketch only; execution reserved for later tracks.",
    }


def compute_narrative(payload: dict[str, Any]) -> dict[str, Any]:
    profile = payload.get("profile") or {}
    rows = _row_count(profile)
    cols = _cols(profile)
    return {
        "headline": f"Dataset narrative · {rows:,} rows × {len(cols)} columns",
        "sections": [
            {
                "title": "Coverage",
                "body": f"The profiled extract covers {rows:,} rows across {len(cols)} fields.",
            },
            {
                "title": "Quality signals",
                "body": "Review null_pct and unique_count in statistics before executive decisions.",
            },
            {
                "title": "Next actions",
                "body": "Prioritize high-null columns for cleaning; forecast on stable numeric KPIs.",
            },
        ],
        "confidence": 58,
    }


def compute_anomaly(payload: dict[str, Any]) -> dict[str, Any]:
    profile = payload.get("profile") or {}
    stats = (profile.get("statistics") or {}).get("columns") or {}
    flags = []
    for name, meta in stats.items():
        if not isinstance(meta, dict):
            continue
        null_pct = float(meta.get("null_pct") or 0)
        if null_pct >= 30:
            flags.append(
                {
                    "column": name,
                    "type": "high_null_rate",
                    "severity": null_pct,
                    "message": f"{name} null rate {null_pct}% exceeds 30% threshold.",
                }
            )
        if meta.get("dtype") == "number":
            mn, mx = meta.get("min"), meta.get("max")
            mean = meta.get("mean")
            if isinstance(mn, (int, float)) and isinstance(mx, (int, float)) and isinstance(mean, (int, float)):
                if mean and (mx - mn) > abs(mean) * 10:
                    flags.append(
                        {
                            "column": name,
                            "type": "wide_range",
                            "message": f"{name} range is very wide relative to mean — check outliers.",
                        }
                    )
    return {
        "anomaly_count": len(flags),
        "anomalies": flags[:50],
        "method": "profile_threshold_v1",
    }


def compute_decisions(payload: dict[str, Any]) -> dict[str, Any]:
    profile = payload.get("profile") or {}
    anomaly = compute_anomaly(payload)
    decisions = []
    for a in anomaly.get("anomalies") or []:
        decisions.append(
            {
                "problem": a.get("message"),
                "impact": "Data quality risk for downstream AI/reporting",
                "action": f"Investigate column “{a.get('column')}” and apply cleaning rules",
                "priority": "high" if a.get("type") == "high_null_rate" else "medium",
            }
        )
    if not decisions:
        decisions.append(
            {
                "problem": "No severe profile anomalies detected",
                "impact": "Stable enough for exploratory analytics",
                "action": "Proceed to KPI dashboard and forecast on primary numeric metric",
                "priority": "low",
            }
        )
    return {
        "decisions": decisions[:20],
        "row_count": _row_count(profile),
        "source": "profile_driven_heuristic",
    }


def compute_indian_intel(payload: dict[str, Any]) -> dict[str, Any]:
    module = str(payload.get("module") or "segmentation")
    profile = payload.get("profile") or {}
    cols = _cols(profile)
    return {
        "module": module,
        "headline": f"Indian Business Intel · {module}",
        "signals": [
            f"Using profiled columns: {', '.join(cols[:6]) or 'n/a'}",
            "Heuristic module output — replace with domain models later.",
        ],
        "recommendations": [
            "Validate GST/invoice fields if present",
            "Segment by region/state columns when available",
            "Track MoM revenue drop on primary amount column",
        ],
        "confidence": 55,
    }


ENGINE_MAP = {
    "chat": compute_chat,
    "forecast": compute_forecast,
    "scientist": compute_scientist,
    "hypothesis": compute_hypothesis,
    "nlp": compute_nlp,
    "narrative": compute_narrative,
    "anomaly": compute_anomaly,
    "decisions": compute_decisions,
    "indian-intel": compute_indian_intel,
    "indian_intel": compute_indian_intel,
}


def run_operation(operation: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    """Backward-compatible entry — prefer ai_service.gateway.run_gateway."""
    from ai_service.operations import ensure_registered
    from ai_service.registry import REGISTRY

    ensure_registered()
    op = (operation or "").strip().lower().replace("_", "-")
    try:
        return REGISTRY.run(op, payload)
    except KeyError as exc:
        raise ValueError(str(exc)) from exc
