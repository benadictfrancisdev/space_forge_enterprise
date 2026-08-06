"""Dataset profiling — Track 4 Unified Dataset Pipeline."""
from __future__ import annotations

import csv
import io
import json
from typing import Any


def _infer_type(values: list[str]) -> str:
    non_empty = [v for v in values if v is not None and str(v).strip() != ""]
    if not non_empty:
        return "empty"
    num = 0
    for v in non_empty:
        try:
            float(str(v).replace(",", ""))
            num += 1
        except ValueError:
            pass
    if num == len(non_empty):
        return "number"
    return "string"


def profile_tabular_bytes(content: bytes, filename: str = "") -> dict[str, Any]:
    """
    Profile CSV/JSON bytes into schema + statistics.
    Excel/PDF deferred — returns a minimal stub profile for unsupported types.
    """
    name = (filename or "").lower()
    text: str
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1", errors="replace")

    rows: list[dict[str, Any]] = []
    columns: list[str] = []

    if name.endswith(".json") or text.lstrip().startswith(("[", "{")):
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                rows = [parsed]
            elif isinstance(parsed, list):
                rows = [r for r in parsed if isinstance(r, dict)]
            if rows:
                col_set: set[str] = set()
                for r in rows:
                    col_set.update(r.keys())
                columns = sorted(col_set)
        except json.JSONDecodeError:
            rows = []

    if not rows:
        reader = csv.DictReader(io.StringIO(text))
        columns = list(reader.fieldnames or [])
        for i, row in enumerate(reader):
            if i >= 50_000:
                break
            rows.append(dict(row))

    if not columns and rows:
        columns = sorted({k for r in rows for k in r.keys()})

    schema_cols = []
    statistics: dict[str, Any] = {"columns": {}, "row_count": len(rows), "column_count": len(columns)}

    for col in columns:
        values = ["" if r.get(col) is None else str(r.get(col)) for r in rows]
        non_empty = [v for v in values if v.strip() != ""]
        null_count = len(values) - len(non_empty)
        dtype = _infer_type(values)
        col_stats: dict[str, Any] = {
            "dtype": dtype,
            "null_count": null_count,
            "null_pct": round((null_count / len(values)) * 100, 2) if values else 0,
            "unique_count": len(set(non_empty)),
            "sample_values": non_empty[:5],
        }
        if dtype == "number" and non_empty:
            nums = []
            for v in non_empty:
                try:
                    nums.append(float(str(v).replace(",", "")))
                except ValueError:
                    pass
            if nums:
                col_stats["min"] = min(nums)
                col_stats["max"] = max(nums)
                col_stats["mean"] = round(sum(nums) / len(nums), 6)
        schema_cols.append({"name": col, "dtype": dtype})
        statistics["columns"][col] = col_stats

    return {
        "schema": {"columns": schema_cols},
        "statistics": statistics,
        "row_count": len(rows),
    }
