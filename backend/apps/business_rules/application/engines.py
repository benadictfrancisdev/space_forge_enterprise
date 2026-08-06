"""Deterministic business rules engines — Track 12.4."""
from __future__ import annotations

from typing import Any


FINANCIAL_COLUMN_HINTS = (
    "amount", "revenue", "sales", "cost", "price", "total", "profit", "margin", "tax", "gst",
)


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


def compute_kpi(
    aggregation: str,
    column: str,
    rows: list[dict],
    statistics: dict,
    row_count: int,
) -> float:
    agg = aggregation.lower()
    if agg == "count":
        return float(row_count)
    col_stats = (statistics.get("columns") or {}).get(column, {})
    nums = _numeric_values(rows, column)
    if agg == "sum":
        return float(sum(nums)) if nums else float(col_stats.get("mean", 0) or 0) * row_count
    if agg == "mean":
        return float(col_stats.get("mean", 0) or (sum(nums) / len(nums) if nums else 0))
    if agg == "min":
        return float(col_stats.get("min", min(nums) if nums else 0))
    if agg == "max":
        return float(col_stats.get("max", max(nums) if nums else 0))
    return float(row_count)


def run_kpi_engine(kpi_defs: list, context: dict) -> list[dict]:
    rows = context["rows"]
    statistics = context["statistics"]
    row_count = context["row_count"]
    results = []
    for kpi in kpi_defs:
        col = kpi.column_name or ""
        value = compute_kpi(kpi.aggregation, col, rows, statistics, row_count)
        target = kpi.target_value
        variance = None
        if target is not None and target != 0:
            variance = round(((value - target) / target) * 100, 2)
        status = "on_target"
        if target is not None:
            if value < target * 0.9:
                status = "below_target"
            elif value > target * 1.1:
                status = "above_target"
        results.append(
            {
                "kpi_id": str(kpi.id),
                "name": kpi.name,
                "value": round(value, 4),
                "target_value": target,
                "variance_pct": variance,
                "status": status,
                "aggregation": kpi.aggregation,
                "column_name": col,
            }
        )
    return results


def run_financial_engine(context: dict) -> dict:
    rows = context["rows"]
    statistics = context["statistics"]
    col_stats = statistics.get("columns") or {}
    financial_cols = []
    for name in col_stats.keys():
        if any(hint in name.lower() for hint in FINANCIAL_COLUMN_HINTS):
            financial_cols.append(name)

    metrics: dict[str, Any] = {}
    for col in financial_cols:
        nums = _numeric_values(rows, col)
        stats = col_stats.get(col, {})
        metrics[col] = {
            "sum": round(sum(nums), 4) if nums else stats.get("mean"),
            "mean": stats.get("mean"),
            "min": stats.get("min"),
            "max": stats.get("max"),
            "count": len(nums),
        }

    revenue_cols = [c for c in financial_cols if "revenue" in c.lower() or "sales" in c.lower()]
    cost_cols = [c for c in financial_cols if "cost" in c.lower()]
    if revenue_cols and cost_cols:
        rev = metrics.get(revenue_cols[0], {}).get("sum") or 0
        cost = metrics.get(cost_cols[0], {}).get("sum") or 0
        if rev and cost:
            metrics["gross_margin_pct"] = round(((rev - cost) / rev) * 100, 2)

    return {"metrics": metrics, "financial_columns": financial_cols, "currency": "USD"}


def evaluate_rule(rule, context: dict) -> dict:
    condition = rule.condition or {}
    field = condition.get("field", "")
    operator = condition.get("operator", "gt")
    threshold = float(condition.get("value", 0))
    statistics = context["statistics"]
    quality = context.get("quality_report")

    actual = 0.0
    if field == "quality_score" and quality:
        actual = float(quality.overall_score)
    elif field == "row_count":
        actual = float(context["row_count"])
    elif field.startswith("null_pct:"):
        col = field.split(":", 1)[1]
        actual = float((statistics.get("columns") or {}).get(col, {}).get("null_pct", 0))
    elif field in (statistics.get("columns") or {}):
        actual = float((statistics["columns"][field].get("mean") or 0))

    passed = False
    if operator == "gt":
        passed = actual > threshold
    elif operator == "gte":
        passed = actual >= threshold
    elif operator == "lt":
        passed = actual < threshold
    elif operator == "lte":
        passed = actual <= threshold
    elif operator == "eq":
        passed = actual == threshold

    return {
        "rule_id": str(rule.id),
        "name": rule.name,
        "passed": passed,
        "actual": actual,
        "threshold": threshold,
        "operator": operator,
        "field": field,
    }


def run_rule_engine(rules: list, context: dict) -> list[dict]:
    return [evaluate_rule(r, context) for r in rules if r.is_active]


def evaluate_policy(policy, context: dict) -> dict:
    violations = []
    quality = context.get("quality_report")
    for req in policy.rules or []:
        req_type = req.get("type")
        if req_type == "min_quality_score":
            min_score = float(req.get("value", 70))
            if not quality or quality.overall_score < min_score:
                violations.append(
                    {
                        "rule": req_type,
                        "message": f"Quality score below {min_score}",
                        "actual": quality.overall_score if quality else None,
                    }
                )
        elif req_type == "require_pii_review":
            pii = (quality.pii_results or {}) if quality else {}
            if pii.get("pii_count", 0) > 0 and not req.get("waived"):
                violations.append(
                    {
                        "rule": req_type,
                        "message": "PII columns detected — review required",
                        "pii_count": pii.get("pii_count"),
                    }
                )
        elif req_type == "max_null_pct":
            col = req.get("column", "")
            max_pct = float(req.get("value", 30))
            null_pct = float(
                (context["statistics"].get("columns") or {}).get(col, {}).get("null_pct", 0)
            )
            if null_pct > max_pct:
                violations.append(
                    {
                        "rule": req_type,
                        "column": col,
                        "message": f"Null rate {null_pct}% exceeds {max_pct}%",
                    }
                )
    return {
        "policy_id": str(policy.id),
        "name": policy.name,
        "compliant": len(violations) == 0,
        "violations": violations,
    }


def run_policy_engine(policies: list, context: dict) -> list[dict]:
    return [evaluate_policy(p, context) for p in policies if p.is_active]


def run_validation_engine(context: dict) -> dict:
    statistics = context["statistics"]
    checks = []
    passed = failed = 0
    for name, meta in (statistics.get("columns") or {}).items():
        null_pct = float(meta.get("null_pct", 0))
        if null_pct >= 50:
            checks.append({"column": name, "status": "fail", "null_pct": null_pct})
            failed += 1
        else:
            checks.append({"column": name, "status": "pass", "null_pct": null_pct})
            passed += 1
    quality = context.get("quality_report")
    if quality and quality.overall_score < 60:
        checks.append({"check": "quality_score", "status": "fail", "score": quality.overall_score})
        failed += 1
    else:
        checks.append({"check": "quality_score", "status": "pass"})
        passed += 1
    return {"checks": checks, "passed": passed, "failed": failed, "valid": failed == 0}
