"""Governance policy evaluation engines — Track 12.9."""
from __future__ import annotations

import time
from typing import Any

from apps.governance.infrastructure.models import (
    DataClassification,
    DatasetGovernance,
    GovernancePolicy,
    PolicyScope,
)


CLASSIFICATION_RANK = {
    DataClassification.PUBLIC: 0,
    DataClassification.INTERNAL: 1,
    DataClassification.CONFIDENTIAL: 2,
    DataClassification.RESTRICTED: 3,
}


def evaluate_access(
    *,
    policies: list[GovernancePolicy],
    classification: str,
    action: str,
    user_permissions: set[str],
) -> tuple[bool, list[str], str | None]:
    """Dynamic policy evaluation — classification + role permissions + policy rules."""
    matched: list[str] = []
    denied_reason: str | None = None

    rank = CLASSIFICATION_RANK.get(classification, 1)

    if action.startswith("ai:") and rank >= CLASSIFICATION_RANK[DataClassification.RESTRICTED]:
        if "governance:admin" not in user_permissions:
            return False, [], "restricted_dataset_ai_blocked"

    if action.startswith("dataset:export") and rank >= CLASSIFICATION_RANK[DataClassification.CONFIDENTIAL]:
        if "dataset:export" not in user_permissions:
            return False, [], "confidential_export_denied"

    for policy in policies:
        if not policy.is_active:
            continue
        rules = policy.rules or {}
        matched.append(str(policy.id))

        deny_actions = rules.get("deny_actions", [])
        if action in deny_actions:
            denied_reason = f"policy_deny:{policy.name}"
            return False, matched, denied_reason

        min_classification = rules.get("min_classification")
        if min_classification and rank < CLASSIFICATION_RANK.get(min_classification, 0):
            denied_reason = f"classification_below:{min_classification}"
            return False, matched, denied_reason

        required_perms = rules.get("required_permissions", [])
        if required_perms and not all(p in user_permissions for p in required_perms):
            denied_reason = f"missing_permissions:{','.join(required_perms)}"
            return False, matched, denied_reason

    return True, matched, denied_reason


def compute_compliance_score(controls: list[Any]) -> float:
    if not controls:
        return 100.0
    ready = sum(1 for c in controls if c.status == "ready")
    return round(100.0 * ready / len(controls), 1)


def compute_security_score(
    violations: list[Any],
    security_policies: list[Any],
) -> float:
    active = sum(1 for p in security_policies if p.is_active)
    if not active:
        return 100.0
    open_violations = sum(1 for v in violations if not v.resolved)
    penalty = min(50.0, open_violations * 5.0)
    return max(0.0, 100.0 - penalty)


def build_lineage_chain(edges: list[Any]) -> list[dict]:
    return [
        {
            "source_type": e.source_type,
            "source_id": str(e.source_id),
            "target_type": e.target_type,
            "target_id": str(e.target_id),
            "stage": e.stage,
        }
        for e in edges
    ]


def timed_evaluate(fn, *args, **kwargs) -> tuple[Any, int]:
    start = time.perf_counter()
    result = fn(*args, **kwargs)
    latency_ms = int((time.perf_counter() - start) * 1000)
    return result, latency_ms
