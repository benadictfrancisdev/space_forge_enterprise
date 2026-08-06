"""Deterministic data quality engine — Track 12.3."""
from __future__ import annotations

import hashlib
from typing import Any


def _row_hash(row: dict) -> str:
    parts = [f"{k}={row.get(k, '')}" for k in sorted(row.keys())]
    return hashlib.md5("|".join(parts).encode()).hexdigest()


def run_validation(schema: dict, statistics: dict, row_count: int) -> dict[str, Any]:
    """Basic structural validation checks."""
    checks = []
    columns = schema.get("columns") or []
    passed = failed = 0

    if row_count > 0:
        checks.append({"check": "has_rows", "status": "pass", "detail": f"{row_count} rows"})
        passed += 1
    else:
        checks.append({"check": "has_rows", "status": "fail", "detail": "empty dataset"})
        failed += 1

    if columns:
        checks.append({"check": "has_schema", "status": "pass", "detail": f"{len(columns)} columns"})
        passed += 1
    else:
        checks.append({"check": "has_schema", "status": "fail", "detail": "no columns"})
        failed += 1

    col_stats = statistics.get("columns") or {}
    for col_def in columns:
        name = col_def.get("name", "")
        stats = col_stats.get(name, {})
        null_pct = stats.get("null_pct", 0)
        if null_pct >= 100:
            checks.append(
                {
                    "check": f"column_{name}_not_all_null",
                    "status": "fail",
                    "detail": "100% null",
                }
            )
            failed += 1
        elif null_pct >= 50:
            checks.append(
                {
                    "check": f"column_{name}_null_rate",
                    "status": "warning",
                    "detail": f"{null_pct}% null",
                }
            )
        else:
            passed += 1

    return {"checks": checks, "passed": passed, "failed": failed, "warnings": len([c for c in checks if c.get("status") == "warning"])}


def run_duplicate_detection(rows: list[dict], columns: list[str]) -> dict[str, Any]:
    seen: dict[str, int] = {}
    duplicate_rows = 0
    for row in rows:
        h = _row_hash(row)
        seen[h] = seen.get(h, 0) + 1
    for count in seen.values():
        if count > 1:
            duplicate_rows += count - 1
    total = len(rows)
    dup_pct = round((duplicate_rows / total) * 100, 2) if total else 0
    return {
        "total_rows": total,
        "duplicate_rows": duplicate_rows,
        "duplicate_pct": dup_pct,
        "unique_rows": len(seen),
        "status": "pass" if dup_pct < 10 else ("warning" if dup_pct < 30 else "fail"),
    }


def run_missing_value_detection(statistics: dict) -> dict[str, Any]:
    col_stats = statistics.get("columns") or {}
    columns_with_missing = []
    for name, stats in col_stats.items():
        null_pct = stats.get("null_pct", 0)
        if null_pct > 0:
            columns_with_missing.append(
                {
                    "column": name,
                    "null_count": stats.get("null_count", 0),
                    "null_pct": null_pct,
                }
            )
    high_missing = [c for c in columns_with_missing if c["null_pct"] >= 30]
    return {
        "columns_with_missing": columns_with_missing,
        "high_missing_columns": high_missing,
        "status": "pass" if not high_missing else ("warning" if len(high_missing) < 3 else "fail"),
    }


def run_schema_drift_detection(
    current_schema: dict,
    previous_schema: dict | None,
) -> dict[str, Any]:
    if not previous_schema:
        return {"status": "pass", "drift_detected": False, "added_columns": [], "removed_columns": []}

    current_cols = {c.get("name") for c in (current_schema.get("columns") or [])}
    previous_cols = {c.get("name") for c in (previous_schema.get("columns") or [])}
    added = sorted(current_cols - previous_cols)
    removed = sorted(previous_cols - current_cols)
    drift = bool(added or removed)
    return {
        "drift_detected": drift,
        "added_columns": added,
        "removed_columns": removed,
        "status": "warning" if drift else "pass",
    }


def run_pii_detection(column_metadata: list) -> dict[str, Any]:
    flagged = []
    for col in column_metadata:
        if getattr(col, "pii_detected", False) or (isinstance(col, dict) and col.get("pii_detected")):
            name = getattr(col, "column_name", None) or col.get("column_name", "")
            ptype = getattr(col, "pii_type", None) or col.get("pii_type", "")
            flagged.append({"column": name, "pii_type": ptype})
    return {
        "pii_columns": flagged,
        "pii_count": len(flagged),
        "status": "warning" if flagged else "pass",
    }


def compute_quality_score(
    validation: dict,
    duplicates: dict,
    missing: dict,
    drift: dict,
    pii: dict,
) -> float:
    score = 100.0
    score -= validation.get("failed", 0) * 15
    score -= validation.get("warnings", 0) * 5
    if duplicates.get("status") == "fail":
        score -= 20
    elif duplicates.get("status") == "warning":
        score -= 10
    if missing.get("status") == "fail":
        score -= 15
    elif missing.get("status") == "warning":
        score -= 5
    if drift.get("drift_detected"):
        score -= 10
    if pii.get("pii_count", 0) > 0:
        score -= min(15, pii["pii_count"] * 3)
    return max(0.0, min(100.0, round(score, 2)))
