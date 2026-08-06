"""Decision Intelligence 2.0 — deterministic orchestration helpers (Track 13.4)."""
from __future__ import annotations

from typing import Any


def _kpi_issues(kpis: list[dict]) -> list[str]:
    issues = []
    for k in kpis:
        status = str(k.get("status", "")).lower()
        if status in {"critical", "warning", "failed", "breach"}:
            name = k.get("name", "KPI")
            issues.append(f"{name} is {status} (value={k.get('value')})")
    return issues


def _failed_rules(rules_eval: dict) -> list[str]:
    failed = []
    for item in rules_eval.get("rules") or []:
        if not item.get("passed"):
            failed.append(item.get("name") or item.get("rule_id", "rule"))
    return failed


def _policy_violations(rules_eval: dict) -> int:
    count = 0
    for item in rules_eval.get("policies") or []:
        if not item.get("compliant"):
            count += len(item.get("violations") or []) or 1
    return count


def build_risk_assessment(insight: dict, rules_eval: dict, analytics: dict) -> dict:
    kpis = insight.get("kpis") or []
    gov = insight.get("governance") or {}
    factors: list[dict[str, Any]] = []
    score = 0.0

    critical_kpis = sum(1 for k in kpis if str(k.get("status", "")).lower() in {"critical", "failed"})
    if critical_kpis:
        score += critical_kpis * 20
        factors.append({"factor": "Critical KPI breaches", "weight": critical_kpis * 20})

    failed = _failed_rules(rules_eval)
    if failed:
        score += len(failed) * 15
        factors.append({"factor": "Business rule failures", "weight": len(failed) * 15})

    violations = _policy_violations(rules_eval)
    if violations:
        score += violations * 10
        factors.append({"factor": "Policy violations", "weight": violations * 10})

    anomalies = analytics.get("anomaly", {}).get("anomalies") or []
    if anomalies:
        score += min(len(anomalies) * 5, 25)
        factors.append({"factor": "Statistical anomalies", "weight": min(len(anomalies) * 5, 25)})

    compliance = gov.get("compliance_score")
    if compliance is not None and compliance < 70:
        score += 15
        factors.append({"factor": "Low compliance score", "weight": 15})

    score = min(100.0, score)
    level = "low" if score < 25 else "medium" if score < 50 else "high" if score < 75 else "critical"
    return {"level": level, "score": round(score, 1), "factors": factors}


def build_impact_analysis(insight: dict, rules_eval: dict) -> dict:
    kpis = insight.get("kpis") or []
    variances = [
        abs(float(k.get("variance_pct") or 0))
        for k in kpis
        if k.get("variance_pct") is not None
    ]
    avg_variance = sum(variances) / len(variances) if variances else 0.0
    financial = rules_eval.get("financial") or {}
    metrics = financial.get("metrics") or {}
    violations = _policy_violations(rules_eval)
    severity = "low" if avg_variance < 10 and violations == 0 else "medium" if avg_variance < 25 else "high"
    return {
        "severity": severity,
        "average_kpi_variance_pct": round(avg_variance, 2),
        "policy_violation_count": violations,
        "financial_highlights": metrics,
        "quality_score": insight.get("quality_score"),
    }


def build_confidence_score(insight: dict, analytics: dict) -> float:
    score = 40.0
    quality = insight.get("quality_score")
    if quality is not None:
        score += float(quality) * 0.35
    score += min(len(insight.get("kpis") or []), 5) * 4
    score += min(len([k for k in analytics if analytics[k]]), 3) * 5
    return round(min(95.0, score), 1)


def build_supporting_evidence(
    insight: dict,
    rules_eval: dict,
    analytics: dict,
) -> list[dict]:
    evidence: list[dict] = []
    for k in (insight.get("kpis") or [])[:8]:
        evidence.append(
            {
                "type": "kpi",
                "source": "business_rules_engine",
                "summary": f"{k.get('name')}: {k.get('value')} ({k.get('status')})",
                "data": k,
            }
        )
    for item in (rules_eval.get("rules") or [])[:5]:
        evidence.append(
            {
                "type": "rule",
                "source": "business_rules_engine",
                "summary": f"Rule {'passed' if item.get('passed') else 'failed'}: {item.get('name', item.get('rule_id'))}",
                "data": item,
            }
        )
    stats = analytics.get("statistics")
    if stats:
        evidence.append(
            {
                "type": "analytics",
                "source": "analytics_engine",
                "summary": f"Descriptive statistics ({stats.get('method', 'statistics')})",
                "data": stats,
            }
        )
    anomaly = analytics.get("anomaly")
    if anomaly and anomaly.get("anomalies"):
        evidence.append(
            {
                "type": "anomaly",
                "source": "analytics_engine",
                "summary": f"{len(anomaly['anomalies'])} anomalies detected",
                "data": anomaly,
            }
        )
    for rec in (insight.get("recommendations") or [])[:3]:
        evidence.append(
            {
                "type": "recommendation",
                "source": "recommendation_engine",
                "summary": rec.get("title", ""),
                "data": rec,
            }
        )
    return evidence


def build_root_causes(insight: dict, rules_eval: dict, analytics: dict) -> list[str]:
    causes = _kpi_issues(insight.get("kpis") or [])
    causes.extend([f"Rule failure: {name}" for name in _failed_rules(rules_eval)])
    anomalies = analytics.get("anomaly", {}).get("anomalies") or []
    for a in anomalies[:3]:
        col = a.get("column") or a.get("field") or "column"
        causes.append(f"Anomaly in {col} (z={a.get('z_score', a.get('z', ''))})")
    if not causes and insight.get("recommendations"):
        causes.append(insight["recommendations"][0].get("title", "See recommendations"))
    return causes[:8]


def _priority_value(raw) -> int:
    if isinstance(raw, int):
        return raw
    if isinstance(raw, float):
        return int(raw)
    mapping = {"low": 1, "medium": 2, "high": 3, "critical": 4}
    if isinstance(raw, str):
        if raw.isdigit():
            return int(raw)
        return mapping.get(raw.lower(), 1)
    return 1


def build_recommended_actions(insight: dict) -> list[dict]:
    actions = []
    for rec in (insight.get("recommendations") or [])[:6]:
        actions.append(
            {
                "title": rec.get("title", ""),
                "description": rec.get("body", ""),
                "priority": _priority_value(rec.get("priority", 1)),
                "category": rec.get("category", "general"),
            }
        )
    if not actions:
        actions.append(
            {
                "title": "Review verified KPI dashboard",
                "description": "Inspect platform KPI results and governance posture before acting.",
                "priority": 1,
                "category": "review",
            }
        )
    return actions


def build_expected_roi(actions: list[dict], impact: dict) -> dict:
    priority_sum = sum(int(a.get("priority", 1)) for a in actions)
    base = min(30.0, priority_sum * 3.0 + impact.get("average_kpi_variance_pct", 0) * 0.5)
    return {
        "estimate_pct": round(base, 1),
        "basis": "heuristic_from_recommendation_priority_and_variance",
        "disclaimer": "Indicative only — not a financial forecast. Validate with finance teams.",
    }


def build_assumptions(insight: dict, analytics: dict) -> list[str]:
    assumptions = [
        "KPI and rule evaluations use the latest platform pipeline outputs.",
        "Quality gate minimum score of 50 applied before analysis.",
    ]
    quality = insight.get("quality_score")
    if quality is not None:
        assumptions.append(f"Dataset quality score: {quality}")
    if analytics.get("statistics"):
        assumptions.append("Statistics computed via platform descriptive_stats engine.")
    if analytics.get("anomaly"):
        assumptions.append("Anomalies detected via z-score threshold on numeric columns.")
    return assumptions


def build_linked_assets(insight: dict, dataset_id: str) -> dict:
    return {
        "dataset_id": dataset_id,
        "kpis": insight.get("kpis") or [],
        "report_types": ["executive", "operational", "compliance"],
        "analytics_operations": [
            a.get("operation") for a in (insight.get("analytics") or []) if a.get("operation")
        ],
    }


def build_reasoning_chain(
    *,
    problem: str,
    rules_eval: dict,
    analytics: dict,
    intelligence: dict,
    insight: dict,
) -> dict:
    stages = [
        {"id": "problem", "label": "Business Problem", "status": "complete"},
        {"id": "business_rules", "label": "Business Rules Engine", "status": "complete"},
        {"id": "analytics", "label": "Analytics Engine", "status": "complete" if analytics else "partial"},
        {"id": "intelligence", "label": "Enterprise Intelligence Engine", "status": "complete"},
        {"id": "recommendations", "label": "Recommendation Engine", "status": "complete"},
        {"id": "risk", "label": "Risk Scoring", "status": "complete"},
        {"id": "impact", "label": "Impact Analysis", "status": "complete"},
        {"id": "ai", "label": "AI Reasoning Layer", "status": "complete"},
        {"id": "executive", "label": "Executive Decision Support", "status": "complete"},
    ]
    return {
        "stages": stages,
        "business_problem": problem,
        "business_rules": {
            "kpi_count": len(rules_eval.get("kpis") or []),
            "rule_count": len(rules_eval.get("rules") or []),
            "policy_count": len(rules_eval.get("policies") or []),
        },
        "analytics": {
            "operations": [k for k in analytics.keys() if analytics[k]],
        },
        "intelligence": intelligence,
        "recommendations": insight.get("recommendations") or [],
    }


def assemble_decision_support(
    *,
    problem: str,
    insight: dict,
    rules_eval: dict,
    analytics: dict,
    intelligence: dict,
    ai_narrative: dict,
    dataset_id: str,
) -> dict:
    impact = build_impact_analysis(insight, rules_eval)
    actions = build_recommended_actions(insight)
    root_causes = build_root_causes(insight, rules_eval, analytics)
    return {
        "problem_summary": problem.strip(),
        "root_causes": root_causes,
        "supporting_evidence": build_supporting_evidence(insight, rules_eval, analytics),
        "business_impact": impact,
        "confidence_score": build_confidence_score(insight, analytics),
        "risk_assessment": build_risk_assessment(insight, rules_eval, analytics),
        "recommended_actions": actions,
        "expected_roi": build_expected_roi(actions, impact),
        "assumptions_used": build_assumptions(insight, analytics),
        "linked_reports_and_kpis": build_linked_assets(insight, dataset_id),
        "executive_narrative": ai_narrative,
    }
