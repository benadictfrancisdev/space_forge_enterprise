"""Enterprise AI Platform services — Track 12.7."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.ai.application.client import AIComputeClient
from apps.audit.application.services import AuditService
from apps.ai_platform.application.engines import (
    build_verified_context_payload,
    cosine_similarity,
    detect_hallucination,
    deterministic_embed,
    run_guardrails,
)
from apps.ai_platform.infrastructure.models import (
    AgentDefinition,
    AIObservabilityEvent,
    AIMemory,
    EmbeddingRecord,
    GuardrailPolicy,
    PromptTemplate,
    RAGChunk,
    RAGDocument,
    ToolDefinition,
)
from apps.business_rules.infrastructure.models import KPIResult
from apps.core.dataset_context import load_dataset_context, require_quality_gate
from apps.core.exceptions import NotFoundError, ValidationError
from apps.datasets.application.services import DatasetService
from apps.datasets.infrastructure.models import Dataset
from apps.intelligence.infrastructure.models import ContextBundle
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

REASON_JOB = "ai_platform.reason"
EMBED_JOB = "ai_platform.embed"
RAG_JOB = "ai_platform.rag"


class AIPlatformService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.datasets = DatasetService()
        self.client = AIComputeClient()

    def _get_dataset(self, *, dataset_id, user, permission: str):
        return self.datasets._get(dataset_id=dataset_id, user=user, permission=permission)

    def _load_verified_context(self, dataset_id: str) -> tuple[dict, dict]:
        ctx = load_dataset_context(dataset_id)
        require_quality_gate(ctx, min_score=50.0)
        bundle = ContextBundle.objects.filter(dataset_id=dataset_id).order_by("-version").first()
        if not bundle:
            raise ValidationError("Intelligence context bundle required — run intelligence.enrich first")

        kpis = list(
            KPIResult.objects.filter(dataset_id=dataset_id).order_by("-created_at")[:20]
        )
        kpi_facts = [
            {"name": r.kpi.name, "value": r.value, "status": r.status}
            for r in kpis
        ]
        from apps.analytics.infrastructure.models import AnalyticsResult

        analytics_results = AnalyticsResult.objects.filter(dataset_id=dataset_id).order_by(
            "-created_at"
        )[:10]
        analytics_summary = {
            r.operation: {"method": r.method, "result": r.result}
            for r in analytics_results
        }

        context_bundle = bundle.bundle or {}
        extra = {"kpis": kpi_facts, "analytics_summary": analytics_summary}
        verified = build_verified_context_payload(context_bundle, extra)
        return ctx, verified

    def list_prompts(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="ai:invoke")
        return PromptTemplate.objects.filter(organization_id=org.id, is_active=True)

    def list_agents(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="ai:invoke")
        return AgentDefinition.objects.filter(organization_id=org.id, is_active=True)

    def list_observability(self, *, organization_id, user, dataset_id=None):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="ai:invoke")
        qs = AIObservabilityEvent.objects.filter(organization_id=org.id)
        if dataset_id:
            qs = qs.filter(dataset_id=dataset_id)
        return qs.order_by("-created_at")[:100]

    @transaction.atomic
    def enqueue_reason(self, *, dataset_id, user, operation: str = "narrative", question: str = ""):
        from apps.jobs.application.services import JobService

        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="ai:invoke")
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=REASON_JOB,
            payload={
                "dataset_id": str(dataset.id),
                "operation": operation,
                "question": question,
            },
        )
        return job

    @transaction.atomic
    def reason_over_verified(
        self,
        *,
        dataset_id,
        user=None,
        actor=None,
        operation: str = "narrative",
        question: str = "",
    ) -> dict:
        if user:
            dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="ai:invoke")
        else:
            dataset = Dataset.objects.get(id=dataset_id)
        ctx, verified = self._load_verified_context(dataset_id)

        policies = list(
            GuardrailPolicy.objects.filter(
                organization_id=dataset.organization_id, is_active=True
            )
        )
        quality_score = ctx["quality_report"].overall_score if ctx.get("quality_report") else None
        passed, violations = run_guardrails(policies, verified, quality_score)
        if not passed:
            raise ValidationError(f"Guardrails blocked AI request: {violations}")

        profile = {
            "schema": ctx["schema"],
            "statistics": ctx["statistics"],
            "row_count": ctx["row_count"],
            "name": dataset.name,
            "profile_status": dataset.profile_status,
        }
        payload = {
            "dataset_id": str(dataset.id),
            "organization_id": str(dataset.organization_id),
            "profile": profile,
            "question": question,
            "verified_context": verified,
            "params": {"reasoning_over_verified": True},
        }

        op = (operation or "narrative").lower().replace("_", "-")
        result = self.client.compute(op, payload)

        answer_text = ""
        res_body = result.get("result") or result
        if isinstance(res_body, dict):
            answer_text = str(
                res_body.get("answer")
                or res_body.get("headline")
                or res_body.get("summary")
                or ""
            )
        hallucination = detect_hallucination(
            answer_text,
            verified.get("verified_facts") or {},
        )

        evaluation = result.get("evaluation") or {}
        AIObservabilityEvent.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            operation=op,
            provider=evaluation.get("provider", ""),
            model=evaluation.get("model", result.get("model", "")),
            latency_ms=int(evaluation.get("latency_ms") or result.get("latency_ms") or 0),
            tokens_total=int((evaluation.get("tokens") or {}).get("total") or 0),
            cost_usd=float(evaluation.get("cost_usd") or 0),
            confidence=float(evaluation.get("confidence") or 0),
            guardrail_passed=True,
            hallucination_score=hallucination.get("hallucination_score"),
            metadata={"violations": violations, "hallucination": hallucination},
            created_by=actor or user,
            updated_by=actor or user,
        )

        AIMemory.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            session_key=f"dataset:{dataset.id}",
            role="assistant",
            content=answer_text[:4000],
            metadata={"operation": op, "hallucination": hallucination},
            created_by=actor or user,
            updated_by=actor or user,
        )

        if actor or user:
            self.audit.record(
                actor=actor or user,
                action=f"ai_platform.{op}",
                resource_type="dataset",
                resource_id=str(dataset.id),
                organization_id=dataset.organization_id,
                after={"hallucination_score": hallucination.get("hallucination_score")},
            )

        result["hallucination_check"] = hallucination
        result["guardrails"] = {"passed": True, "violations": violations}
        return result

    @transaction.atomic
    def embed_dataset(self, *, dataset_id, actor=None, max_rows: int = 200) -> dict:
        ctx = load_dataset_context(dataset_id)
        require_quality_gate(ctx, min_score=50.0)
        dataset = ctx["dataset"]
        rows = ctx["rows"][:max_rows]
        EmbeddingRecord.objects.filter(dataset_id=dataset.id).delete()

        count = 0
        for idx, row in enumerate(rows):
            text = " | ".join(f"{k}={v}" for k, v in list(row.items())[:12])
            vector = deterministic_embed(text)
            EmbeddingRecord.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                source_type="row",
                source_key=str(idx),
                text=text[:2000],
                vector=vector,
                created_by=actor,
                updated_by=actor,
            )
            count += 1

        return {"dataset_id": str(dataset.id), "embeddings_created": count, "model": "spaceforge-hash-v1"}

    @transaction.atomic
    def rag_query(self, *, dataset_id, user, query: str, top_k: int = 5) -> dict:
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="ai:invoke")
        self.embed_dataset(dataset_id=dataset.id, actor=user, max_rows=500)
        query_vec = deterministic_embed(query)

        scored = []
        for emb in EmbeddingRecord.objects.filter(dataset_id=dataset.id)[:500]:
            sim = cosine_similarity(query_vec, emb.vector or [])
            scored.append((sim, emb))
        scored.sort(key=lambda x: x[0], reverse=True)
        top = [{"score": s, "text": e.text, "source_key": e.source_key} for s, e in scored[:top_k]]

        reason_payload = {
            "question": query,
            "rag_chunks": top,
            "verified_context": verified,
        }
        narrative = self.reason_over_verified(
            dataset_id=dataset_id,
            user=user,
            operation="chat",
            question=f"Context: {top[:3]}. Question: {query}",
        )
        return {
            "query": query,
            "retrieved_chunks": top,
            "reasoning": narrative,
        }

    def run_reason_for_job(self, *, job) -> dict:
        payload = job.payload or {}
        dataset_id = payload.get("dataset_id")
        if not dataset_id:
            raise ValueError("dataset_id required")
        return self.reason_over_verified(
            dataset_id=dataset_id,
            actor=job.created_by,
            operation=payload.get("operation", "narrative"),
            question=payload.get("question", ""),
        )

    def run_embed_for_job(self, *, job) -> dict:
        dataset_id = (job.payload or {}).get("dataset_id")
        if not dataset_id:
            raise ValueError("dataset_id required")
        return self.embed_dataset(dataset_id=dataset_id, actor=job.created_by)

    def run_rag_for_job(self, *, job) -> dict:
        payload = job.payload or {}
        dataset_id = payload.get("dataset_id")
        query = payload.get("query", "")
        if not dataset_id or not query:
            raise ValueError("dataset_id and query required")
        # Job path without user context
        dataset = Dataset.objects.get(id=dataset_id)
        self.embed_dataset(dataset_id=dataset_id, actor=job.created_by)
        query_vec = deterministic_embed(query)
        scored = []
        for emb in EmbeddingRecord.objects.filter(dataset_id=dataset.id)[:500]:
            sim = cosine_similarity(query_vec, emb.vector or [])
            scored.append((sim, emb))
        scored.sort(key=lambda x: x[0], reverse=True)
        top = [{"score": s, "text": e.text} for s, e in scored[:5]]
        result = self.reason_over_verified(
            dataset_id=dataset_id,
            actor=job.created_by,
            operation="chat",
            question=f"RAG context: {top}. Q: {query}",
        )
        return {"query": query, "retrieved_chunks": top, "reasoning": result}
