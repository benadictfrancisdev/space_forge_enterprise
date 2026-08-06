"""Layer transforms for the enterprise data pipeline — Track 12.1."""
from __future__ import annotations

import csv
import io
import json
from typing import Any


def _decode_bytes(content: bytes) -> str:
    try:
        return content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="replace")


def _parse_tabular(text: str, filename: str = "") -> tuple[list[dict[str, Any]], list[str]]:
    name = (filename or "").lower()
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
    return rows, columns


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


def profile_rows(rows: list[dict[str, Any]], columns: list[str]) -> dict[str, Any]:
    schema_cols = []
    statistics: dict[str, Any] = {
        "columns": {},
        "row_count": len(rows),
        "column_count": len(columns),
    }
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


def rows_to_csv_bytes(rows: list[dict[str, Any]]) -> bytes:
    if not rows:
        return b""
    fieldnames: list[str] = list(rows[0].keys())
    for row in rows[1:]:
        for key in row:
            if key not in fieldnames:
                fieldnames.append(key)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k, "") for k in fieldnames})
    return buf.getvalue().encode("utf-8")


def bronze_normalize(rows: list[dict[str, Any]], columns: list[str]) -> list[dict[str, Any]]:
    """Bronze: preserve raw values with consistent column keys."""
    normalized = []
    for row in rows:
        normalized.append({col: row.get(col, "") for col in columns})
    return normalized


def silver_clean(rows: list[dict[str, Any]], columns: list[str]) -> list[dict[str, Any]]:
    """Silver: trim strings, normalize empty strings to null markers."""
    cleaned = []
    for row in rows:
        out: dict[str, Any] = {}
        for col in columns:
            val = row.get(col, "")
            if val is None:
                out[col] = ""
            else:
                s = str(val).strip()
                out[col] = s if s else ""
        cleaned.append(out)
    return cleaned


def parse_content(content: bytes, filename: str = "") -> tuple[list[dict[str, Any]], list[str]]:
    text = _decode_bytes(content)
    return _parse_tabular(text, filename)
