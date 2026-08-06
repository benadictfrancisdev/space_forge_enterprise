"""AI gateway service — loads dataset profile, calls compute, audits."""
from __future__ import annotations

import logging
from typing import Any

from apps.ai.application.client import AIComputeClient
from apps.audit.application.services import AuditService
from apps.core import metrics
from apps.core.exceptions import ValidationError
from apps.datasets.application.services import DatasetService
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

logger = logging.getLogger("spaceforge.ai")

# Keep a local allowlist for Django validation; registry is source of truth in ai_service
SUPPORTED_OPERATIONS = {
    "chat",
    "forecast",
    "scientist",
    "hypothesis",
    "nlp",
    "narrative",
    "anomaly",
    "decisions",
    "indian-intel",
}


class AIGatewayService:
    def __init__(self):
        self.client = AIComputeClient()
        self.datasets = DatasetService()
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()

    def run(
        self,
        *,
        operation: str,
        user,
        organization_id,
        dataset_id: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        op = (operation or "").strip().lower().replace("_", "-")
        if op not in SUPPORTED_OPERATIONS:
            raise ValidationError(f"Unsupported AI operation: {operation}")

        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="ai:invoke")

        body = dict(payload or {})
        profile: dict[str, Any] = {}
        if dataset_id:
            dataset = self.datasets.get(dataset_id=dataset_id, user=user)
            if str(dataset.organization_id) != str(org.id):
                raise ValidationError("dataset_id does not belong to organization")
            profile = {
                "schema": dataset.schema or {},
                "statistics": dataset.statistics or {},
                "row_count": dataset.row_count,
                "profile_status": dataset.profile_status,
                "name": dataset.name,
            }
            body.setdefault("dataset_id", str(dataset.id))

        body["organization_id"] = str(org.id)
        body["profile"] = body.get("profile") or profile

        result = self.client.compute(op, body)
        evaluation = result.get("evaluation") or {}
        provider = evaluation.get("provider") or "unknown"
        latency_ms = evaluation.get("latency_ms") or result.get("latency_ms") or 0
        metrics.incr("ai_requests_total", operation=op, provider=provider)
        metrics.gauge("ai_request_latency_ms", float(latency_ms), operation=op)
        if "fallback" in str(result.get("transport", "")):
            metrics.incr("ai_fallback_total", operation=op, provider=provider)
        logger.info(
            "ai_request_completed",
            extra={
                "operation": op,
                "organization_id": str(org.id),
                "provider": provider,
                "latency_ms": latency_ms,
                "user_id": str(getattr(user, "id", "") or ""),
            },
        )
        self.audit.record(
            actor=user,
            action=f"ai.{op}",
            resource_type="dataset" if dataset_id else "ai",
            resource_id=str(dataset_id or op),
            organization_id=org.id,
            after={
                "operation": op,
                "model": result.get("model") or evaluation.get("model"),
                "provider": evaluation.get("provider"),
                "latency_ms": evaluation.get("latency_ms") or result.get("latency_ms"),
                "cost_usd": evaluation.get("cost_usd"),
                "transport": result.get("transport"),
            },
        )
        return result
