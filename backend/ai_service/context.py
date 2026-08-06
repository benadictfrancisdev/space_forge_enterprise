"""AI Context Builder — Track 8.2.

Prepares structured business context from dataset profile before compute.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any


def _column_names(profile: dict[str, Any]) -> list[str]:
    schema = profile.get("schema") or {}
    columns = schema.get("columns") or []
    names: list[str] = []
    for c in columns:
        if isinstance(c, dict) and c.get("name"):
            names.append(str(c["name"]))
        elif isinstance(c, str):
            names.append(c)
    if not names:
        stats = (profile.get("statistics") or {}).get("columns") or {}
        names = list(stats.keys())
    return names


def _numeric_columns(profile: dict[str, Any]) -> list[str]:
    stats = (profile.get("statistics") or {}).get("columns") or {}
    return [
        name
        for name, meta in stats.items()
        if isinstance(meta, dict) and meta.get("dtype") == "number"
    ]


def build_ai_context(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Enrich payload with normalized context block used by prompts and engines.
    Does not mutate the original payload dict in-place.
    """
    body = dict(payload or {})
    profile = dict(body.get("profile") or {})
    stats = profile.get("statistics") or {}
    col_stats = stats.get("columns") if isinstance(stats, dict) else {}

    columns = _column_names(profile)
    numeric = _numeric_columns(profile)
    row_count = int(profile.get("row_count") or stats.get("row_count") or 0)

    quality_flags: list[str] = []
    if profile.get("profile_status") not in (None, "ready", "READY"):
        quality_flags.append(f"profile_status={profile.get('profile_status')}")
    if row_count == 0:
        quality_flags.append("empty_dataset")

    if isinstance(col_stats, dict):
        for name, meta in list(col_stats.items())[:20]:
            if isinstance(meta, dict) and float(meta.get("null_pct") or 0) >= 25:
                quality_flags.append(f"high_null:{name}")

    context = {
        "dataset_name": profile.get("name") or body.get("dataset_name") or "",
        "row_count": row_count,
        "column_count": len(columns),
        "columns": columns[:50],
        "numeric_columns": numeric[:20],
        "profile_status": profile.get("profile_status"),
        "quality_flags": quality_flags,
        "statistics_summary": {
            "column_count": len(col_stats) if isinstance(col_stats, dict) else 0,
            "numeric_count": len(numeric),
        },
    }

    body["context"] = context
    body["profile"] = profile
    return body


def context_hash(context: dict[str, Any]) -> str:
    """Stable short hash for audit/metadata."""
    blob = json.dumps(context, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode()).hexdigest()[:16]
