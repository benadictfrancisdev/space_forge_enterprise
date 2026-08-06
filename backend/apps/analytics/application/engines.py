"""Deterministic analytics engines — Track 12.5."""
from __future__ import annotations

import math
from typing import Any


def _numeric_values(rows: list[dict], column: str) -> list[float]:
    vals = []
    for row in rows:
        raw = row.get(column)
        if raw is None or str(raw).strip() == "":
            continue
        try:
            vals.append(float(str(raw).replace(",", "")))
        except ValueError:
            continue
    return vals


def _mean(vals: list[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def _std(vals: list[float]) -> float:
    if len(vals) < 2:
        return 0.0
    m = _mean(vals)
    return math.sqrt(sum((x - m) ** 2 for x in vals) / len(vals))


def run_statistics(context: dict) -> dict:
    rows = context["rows"]
    statistics = context["statistics"]
    columns = context["columns"]
    detailed = {}
    for col in columns:
        nums = _numeric_values(rows, col)
        col_stats = (statistics.get("columns") or {}).get(col, {})
        if nums:
            detailed[col] = {
                "dtype": "number",
                "count": len(nums),
                "mean": round(_mean(nums), 6),
                "std": round(_std(nums), 6),
                "min": min(nums),
                "max": max(nums),
                "median": sorted(nums)[len(nums) // 2],
            }
        else:
            detailed[col] = {
                "dtype": col_stats.get("dtype", "string"),
                "unique_count": col_stats.get("unique_count"),
                "null_pct": col_stats.get("null_pct"),
            }
    return {
        "row_count": context["row_count"],
        "column_count": len(columns),
        "columns": detailed,
        "method": "descriptive_stats_v1",
    }


def run_forecast(context: dict, params: dict) -> dict:
    rows = context["rows"]
    statistics = context["statistics"]
    target = params.get("target_column")
    horizon = int(params.get("horizon", 7))
    numeric_cols = [
        name
        for name, meta in (statistics.get("columns") or {}).items()
        if isinstance(meta, dict) and meta.get("dtype") == "number"
    ]
    if not target:
        target = numeric_cols[0] if numeric_cols else None
    if not target:
        return {"error": "no_numeric_column", "method": "linear_trend_v1"}

    nums = _numeric_values(rows, target)
    if len(nums) < 2:
        base = (statistics.get("columns") or {}).get(target, {}).get("mean", 0) or 0
        series = [{"period": i, "value": round(float(base), 4)} for i in range(1, horizon + 1)]
    else:
        n = len(nums)
        x_mean = (n - 1) / 2
        y_mean = _mean(nums)
        slope = sum((i - x_mean) * (nums[i] - y_mean) for i in range(n)) / max(
            sum((i - x_mean) ** 2 for i in range(n)), 1e-9
        )
        intercept = y_mean - slope * x_mean
        series = []
        scenario = params.get("scenario")
        multiplier = 1.15 if scenario == "best" else 0.85 if scenario == "worst" else 1.0
        for i in range(1, horizon + 1):
            pred = (intercept + slope * (n + i)) * multiplier
            series.append({"period": i, "value": round(pred, 4)})

    return {
        "target_column": target,
        "horizon": horizon,
        "forecast": series,
        "method": "linear_trend_v1",
    }


def run_anomaly_detection(context: dict, params: dict) -> dict:
    rows = context["rows"]
    statistics = context["statistics"]
    z_threshold = float(params.get("z_threshold", 2.5))
    anomalies = []
    for name, meta in (statistics.get("columns") or {}).items():
        if not isinstance(meta, dict) or meta.get("dtype") != "number":
            continue
        nums = _numeric_values(rows, name)
        if len(nums) < 5:
            continue
        m, s = _mean(nums), _std(nums)
        if s == 0:
            continue
        for idx, v in enumerate(nums):
            z = abs((v - m) / s)
            if z >= z_threshold:
                anomalies.append(
                    {
                        "column": name,
                        "row_index": idx,
                        "value": v,
                        "z_score": round(z, 4),
                        "type": "z_score_outlier",
                    }
                )
    return {
        "anomaly_count": len(anomalies),
        "anomalies": anomalies[:100],
        "method": "z_score_v1",
        "z_threshold": z_threshold,
    }


def run_timeseries(context: dict, params: dict) -> dict:
    rows = context["rows"]
    date_hints = ("date", "time", "timestamp", "month", "year")
    date_col = params.get("date_column")
    value_col = params.get("value_column")
    if not date_col:
        for col in context["columns"]:
            if any(h in col.lower() for h in date_hints):
                date_col = col
                break
    statistics = context["statistics"]
    if not value_col:
        for name, meta in (statistics.get("columns") or {}).items():
            if isinstance(meta, dict) and meta.get("dtype") == "number":
                value_col = name
                break

    buckets: dict[str, float] = {}
    if date_col and value_col:
        for row in rows:
            key = str(row.get(date_col, "")).strip()[:10] or "unknown"
            nums = _numeric_values([row], value_col)
            buckets[key] = buckets.get(key, 0) + (nums[0] if nums else 0)

    series = [{"period": k, "value": round(v, 4)} for k, v in sorted(buckets.items())]
    return {
        "date_column": date_col,
        "value_column": value_col,
        "series": series,
        "method": "bucket_aggregate_v1",
    }


def run_feature_engineering(context: dict) -> dict:
    rows = context["rows"]
    statistics = context["statistics"]
    features = []
    for name, meta in (statistics.get("columns") or {}).items():
        if not isinstance(meta, dict) or meta.get("dtype") != "number":
            continue
        nums = _numeric_values(rows, name)
        if not nums:
            continue
        m, s = _mean(nums), _std(nums)
        features.append(
            {
                "source_column": name,
                "features": {
                    f"{name}_normalized": "value / max" if max(nums) else "value",
                    f"{name}_z": f"(value - {round(m,4)}) / {round(s,4) or 1}",
                },
                "stats": {"mean": round(m, 4), "std": round(s, 4)},
            }
        )
    return {"engineered_features": features, "method": "feature_sketch_v1"}


def run_ml_baseline(context: dict, params: dict) -> dict:
    statistics = context["statistics"]
    target = params.get("target_column")
    numeric = [
        n
        for n, m in (statistics.get("columns") or {}).items()
        if isinstance(m, dict) and m.get("dtype") == "number"
    ]
    if not target and numeric:
        target = numeric[0]
    if not target:
        return {"error": "no_target", "method": "threshold_classifier_v1"}
    rows = context["rows"]
    nums = _numeric_values(rows, target)
    threshold = _mean(nums) if nums else 0
    predicted_high = sum(1 for v in nums if v >= threshold)
    return {
        "target_column": target,
        "threshold": round(threshold, 4),
        "predicted_high_count": predicted_high,
        "predicted_low_count": len(nums) - predicted_high,
        "method": "threshold_classifier_v1",
        "model_type": "heuristic_split",
    }


def run_optimization(context: dict, params: dict) -> dict:
    statistics = context["statistics"]
    numeric = [
        (n, m.get("mean"))
        for n, m in (statistics.get("columns") or {}).items()
        if isinstance(m, dict) and m.get("dtype") == "number"
    ]
    maximize = params.get("objective", "max")
    if not numeric:
        return {"error": "no_numeric_columns", "method": "greedy_v1"}
    best = max(numeric, key=lambda x: x[1] or 0) if maximize == "max" else min(
        numeric, key=lambda x: x[1] or 0
    )
    return {
        "objective": maximize,
        "recommended_column": best[0],
        "objective_value": best[1],
        "method": "greedy_column_v1",
    }


def run_funnel(context: dict, params: dict) -> dict:
    rows = context["rows"]
    stage_column = params.get("stage_column") or ""
    stages = params.get("stages") or []
    if not stage_column or not stages:
        return {"error": "stage_column and stages required", "method": "funnel_v1"}

    stage_counts = {s: 0 for s in stages}
    for row in rows:
        raw = str(row.get(stage_column, "")).strip().lower()
        matched_idx = -1
        for i, stage in enumerate(stages):
            if raw == stage.lower() or stage.lower() in raw:
                matched_idx = i
                break
        if matched_idx >= 0:
            for j in range(matched_idx, len(stages)):
                stage_counts[stages[j]] += 1

    funnel = []
    prev = None
    for stage in stages:
        count = stage_counts.get(stage, 0)
        conversion = round(100.0 * count / prev, 1) if prev else 100.0
        funnel.append({"stage": stage, "count": count, "conversion_pct": conversion})
        prev = count if count else prev

    nodes = [{"id": s, "label": s} for s in stages]
    links = []
    for i in range(len(stages) - 1):
        links.append(
            {
                "source": stages[i],
                "target": stages[i + 1],
                "value": stage_counts.get(stages[i + 1], 0),
            }
        )
    return {
        "stage_column": stage_column,
        "stages": funnel,
        "sankey": {"nodes": nodes, "links": links},
        "method": "funnel_v1",
    }


def run_cohort(context: dict, params: dict) -> dict:
    rows = context["rows"]
    group_col = params.get("group_column") or ""
    if not group_col:
        return {"error": "group_column required", "method": "cohort_v1"}
    groups: dict[str, int] = {}
    for row in rows:
        key = str(row.get(group_col, "unknown"))
        groups[key] = groups.get(key, 0) + 1
    cohorts = [{"cohort": k, "count": v} for k, v in sorted(groups.items(), key=lambda x: -x[1])]
    return {"group_column": group_col, "cohorts": cohorts, "method": "cohort_v1"}


OPERATIONS = {
    "statistics": lambda ctx, p: run_statistics(ctx),
    "forecast": run_forecast,
    "anomaly": run_anomaly_detection,
    "timeseries": run_timeseries,
    "features": lambda ctx, p: run_feature_engineering(ctx),
    "ml": run_ml_baseline,
    "optimization": run_optimization,
    "funnel": run_funnel,
    "cohort": run_cohort,
}


def run_analytics_operation(operation: str, context: dict, params: dict | None = None) -> dict:
    op = (operation or "statistics").lower()
    fn = OPERATIONS.get(op)
    if not fn:
        raise ValueError(f"Unknown analytics operation: {operation}")
    return fn(context, params or {})
