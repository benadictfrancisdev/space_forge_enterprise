"""Journey analytics helpers — deterministic orchestration (Track 13.5)."""
from __future__ import annotations

from datetime import datetime
from typing import Any


def compute_drop_off(stages: list[dict]) -> list[dict]:
    drops: list[dict] = []
    for i in range(1, len(stages)):
        prev = stages[i - 1].get("count", 0) or 0
        curr = stages[i].get("count", 0) or 0
        drop = max(0, prev - curr)
        drops.append(
            {
                "from_stage": stages[i - 1].get("stage", ""),
                "to_stage": stages[i].get("stage", ""),
                "drop_off_count": drop,
                "drop_off_pct": round(100.0 * drop / prev, 1) if prev else 0.0,
            }
        )
    return drops


def compute_stage_conversion(stages: list[dict]) -> list[dict]:
    return [
        {
            "stage": s.get("stage", ""),
            "count": s.get("count", 0),
            "conversion_pct": s.get("conversion_pct", 0),
        }
        for s in stages
    ]


def compute_time_in_stage(
    rows: list[dict],
    *,
    stage_column: str,
    stages: list[str],
    time_column: str | None = None,
    entity_column: str | None = None,
) -> list[dict]:
    if not time_column or not rows:
        return [
            {
                "stage": stage,
                "avg_hours": None,
                "sample_size": 0,
                "note": "Configure time_column for duration metrics",
            }
            for stage in stages
        ]

    durations: dict[str, list[float]] = {s: [] for s in stages}
    grouped: dict[str, list[dict]] = {}
    if entity_column:
        for row in rows:
            key = str(row.get(entity_column, "default"))
            grouped.setdefault(key, []).append(row)
    else:
        grouped["all"] = rows

    for entity_rows in grouped.values():
        parsed: list[tuple[datetime, str]] = []
        for row in entity_rows:
            raw_time = row.get(time_column)
            raw_stage = str(row.get(stage_column, "")).strip().lower()
            if not raw_time:
                continue
            try:
                if isinstance(raw_time, datetime):
                    dt = raw_time
                else:
                    dt = datetime.fromisoformat(str(raw_time).replace("Z", "+00:00"))
            except (TypeError, ValueError):
                continue
            matched = ""
            for stage in stages:
                if raw_stage == stage.lower() or stage.lower() in raw_stage:
                    matched = stage
                    break
            if matched:
                parsed.append((dt, matched))

        parsed.sort(key=lambda x: x[0])
        for i in range(len(parsed) - 1):
            stage = parsed[i][1]
            delta_hours = (parsed[i + 1][0] - parsed[i][0]).total_seconds() / 3600.0
            if delta_hours >= 0 and stage in durations:
                durations[stage].append(delta_hours)

    result = []
    for stage in stages:
        samples = durations.get(stage, [])
        avg = round(sum(samples) / len(samples), 2) if samples else None
        result.append(
            {
                "stage": stage,
                "avg_hours": avg,
                "sample_size": len(samples),
            }
        )
    return result


def build_sankey_from_funnel(funnel_result: dict, flow_type: str = "journey") -> dict:
    sankey = funnel_result.get("sankey") or {}
    nodes = sankey.get("nodes") or []
    links = sankey.get("links") or []
    if not nodes and funnel_result.get("stages"):
        stages = [s.get("stage") for s in funnel_result["stages"]]
        nodes = [{"id": s, "label": s} for s in stages if s]
        links = []
        for i in range(len(stages) - 1):
            links.append(
                {
                    "source": stages[i],
                    "target": stages[i + 1],
                    "value": funnel_result["stages"][i + 1].get("count", 0),
                }
            )
    return {
        "flow_type": flow_type,
        "nodes": nodes,
        "links": links,
        "method": funnel_result.get("method", "funnel_v1"),
    }
