"""Enterprise Intelligence services — Track 12.6."""
from __future__ import annotations

from collections import Counter
from itertools import combinations

from django.db import transaction

from apps.audit.application.services import AuditService
from apps.business_rules.application.engines import compute_kpi
from apps.core.dataset_context import load_dataset_context, require_quality_gate
from apps.datasets.application.services import DatasetService
from apps.intelligence.infrastructure.models import (
    ContextBundle,
    DimensionDefinition,
    GlossaryTerm,
    IndustryModel,
    KnowledgeGraphEdge,
    KnowledgeGraphNode,
    MetricDefinition,
    Recommendation,
    SemanticModel,
)
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

ENRICH_JOB = "intelligence.enrich"

INDUSTRY_TEMPLATES = [
    {
        "industry": "retail",
        "name": "Retail Analytics",
        "kpi_templates": [
            {"name": "Total Revenue", "column": "amount", "aggregation": "sum"},
            {"name": "Order Count", "aggregation": "count"},
        ],
        "metric_templates": [{"name": "AOV", "expression": "sum(amount)/count"}],
    },
    {
        "industry": "finance",
        "name": "Financial Services",
        "kpi_templates": [
            {"name": "Total Volume", "column": "amount", "aggregation": "sum"},
        ],
        "metric_templates": [],
    },
    {
        "industry": "saas",
        "name": "SaaS Metrics",
        "kpi_templates": [
            {"name": "Active Users", "aggregation": "count"},
        ],
        "metric_templates": [],
    },
]


class SemanticService:
    def resolve_metrics(self, semantic_model: SemanticModel, context: dict) -> list[dict]:
        rows = context["rows"]
        statistics = context["statistics"]
        row_count = context["row_count"]
        resolved = []
        for metric in semantic_model.metrics.all():
            value = compute_kpi(
                metric.aggregation,
                metric.column_name,
                rows,
                statistics,
                row_count,
            )
            resolved.append(
                {
                    "metric_id": str(metric.id),
                    "name": metric.name,
                    "value": round(value, 4),
                    "expression": metric.expression,
                }
            )
        return resolved


class IntelligenceService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.datasets = DatasetService()
        self.semantic = SemanticService()

    def _get_dataset(self, *, dataset_id, user, permission: str):
        return self.datasets._get(dataset_id=dataset_id, user=user, permission=permission)

    def list_semantic_models(self, *, organization_id, user, dataset_id=None):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:read")
        qs = SemanticModel.objects.filter(organization_id=org.id)
        if dataset_id:
            qs = qs.filter(dataset_id=dataset_id)
        return qs

    @transaction.atomic
    def create_semantic_model(self, *, organization_id, workspace_id, user, dataset_id, name, **kw):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:write")
        dataset = self.datasets.get(dataset_id=dataset_id, user=user)
        return SemanticModel.objects.create(
            organization_id=org.id,
            workspace_id=workspace_id,
            dataset=dataset,
            name=name,
            description=kw.get("description", ""),
            created_by=user,
            updated_by=user,
        )

    def list_glossary(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:read")
        return GlossaryTerm.objects.filter(organization_id=org.id)

    def list_industry_models(self, *, organization_id, user):
        from django.db.models import Q

        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:read")
        return IndustryModel.objects.filter(Q(organization_id=org.id) | Q(is_system=True))

    @transaction.atomic
    def enqueue_enrich(self, *, dataset_id, user):
        from apps.jobs.application.services import JobService

        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=ENRICH_JOB,
            payload={"dataset_id": str(dataset.id)},
            timeout_seconds=600,
        )
        return job

    @transaction.atomic
    def enrich_dataset(self, *, dataset_id, actor=None, require_quality: bool = True) -> dict:
        context = load_dataset_context(dataset_id)
        if require_quality:
            require_quality_gate(context, min_score=50.0)

        dataset = context["dataset"]
        schema = context["schema"]
        statistics = context["statistics"]
        columns = context["columns"]

        semantic, _ = SemanticModel.objects.get_or_create(
            dataset=dataset,
            defaults={
                "organization_id": dataset.organization_id,
                "workspace_id": dataset.workspace_id,
                "name": f"{dataset.name} Semantic Model",
                "created_by": actor,
                "updated_by": actor,
            },
        )

        KnowledgeGraphNode.objects.filter(dataset_id=dataset.id).delete()
        KnowledgeGraphEdge.objects.filter(dataset_id=dataset.id).delete()
        Recommendation.objects.filter(dataset_id=dataset.id).delete()

        nodes = []
        for col in columns:
            col_stats = (statistics.get("columns") or {}).get(col, {})
            node = KnowledgeGraphNode.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                entity_type="column",
                entity_key=col,
                label=col,
                properties=col_stats,
                created_by=actor,
                updated_by=actor,
            )
            nodes.append(node)
            MetricDefinition.objects.get_or_create(
                semantic_model=semantic,
                name=f"Total {col}",
                defaults={
                    "organization_id": dataset.organization_id,
                    "workspace_id": dataset.workspace_id,
                    "expression": f"sum({col})",
                    "column_name": col,
                    "aggregation": "sum" if col_stats.get("dtype") == "number" else "count",
                    "created_by": actor,
                    "updated_by": actor,
                },
            )
            DimensionDefinition.objects.get_or_create(
                semantic_model=semantic,
                name=col,
                defaults={
                    "organization_id": dataset.organization_id,
                    "workspace_id": dataset.workspace_id,
                    "column_name": col,
                    "created_by": actor,
                    "updated_by": actor,
                },
            )

        for a, b in combinations(nodes[:20], 2):
            KnowledgeGraphEdge.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                source_node=a,
                target_node=b,
                relationship="co_occurrence",
                weight=0.5,
                created_by=actor,
                updated_by=actor,
            )

        for col_def in (schema.get("columns") or [])[:10]:
            name = col_def.get("name", "")
            if name:
                GlossaryTerm.objects.get_or_create(
                    organization_id=dataset.organization_id,
                    term=name.lower().replace("_", " "),
                    defaults={
                        "workspace_id": dataset.workspace_id,
                        "definition": f"Column {name} ({col_def.get('dtype', 'unknown')})",
                        "domain": "dataset",
                        "related_columns": [name],
                        "created_by": actor,
                        "updated_by": actor,
                    },
                )

        metrics = self.semantic.resolve_metrics(semantic, context)
        recommendations = self._build_recommendations(context)
        for rec in recommendations:
            Recommendation.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                category=rec["category"],
                title=rec["title"],
                body=rec["body"],
                priority=rec["priority"],
                metadata=rec.get("metadata", {}),
                created_by=actor,
                updated_by=actor,
            )

        bundle = {
            "dataset_id": str(dataset.id),
            "row_count": context["row_count"],
            "columns": columns,
            "quality_score": context["quality_report"].overall_score if context["quality_report"] else None,
            "metrics": metrics,
            "statistics_summary": statistics,
        }
        prev = ContextBundle.objects.filter(dataset_id=dataset.id).order_by("-version").first()
        version = (prev.version + 1) if prev else 1
        ContextBundle.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            bundle=bundle,
            version=version,
            created_by=actor,
            updated_by=actor,
        )

        if actor:
            self.audit.record(
                actor=actor,
                action="intelligence.enriched",
                resource_type="dataset",
                resource_id=str(dataset.id),
                organization_id=dataset.organization_id,
            )

        return {
            "dataset_id": str(dataset.id),
            "semantic_model_id": str(semantic.id),
            "graph_nodes": len(nodes),
            "graph_edges": KnowledgeGraphEdge.objects.filter(dataset_id=dataset.id).count(),
            "recommendations": len(recommendations),
            "metrics": metrics,
            "context_version": version,
        }

    def _build_recommendations(self, context: dict) -> list[dict]:
        recs = []
        quality = context.get("quality_report")
        if quality and quality.overall_score < 80:
            recs.append(
                {
                    "category": "quality",
                    "title": "Improve data quality",
                    "body": f"Quality score is {quality.overall_score}. Review missing values and duplicates.",
                    "priority": "high",
                }
            )
        stats = context["statistics"]
        for name, meta in (stats.get("columns") or {}).items():
            if float(meta.get("null_pct", 0)) > 20:
                recs.append(
                    {
                        "category": "cleansing",
                        "title": f"Address nulls in {name}",
                        "body": f"Column {name} has {meta.get('null_pct')}% null values.",
                        "priority": "medium",
                        "metadata": {"column": name},
                    }
                )
        numeric = [
            n for n, m in (stats.get("columns") or {}).items()
            if isinstance(m, dict) and m.get("dtype") == "number"
        ]
        if numeric:
            recs.append(
                {
                    "category": "analytics",
                    "title": "Run forecast on primary metric",
                    "body": f"Numeric columns available: {', '.join(numeric[:3])}. Use analytics forecast.",
                    "priority": "low",
                }
            )
        if not recs:
            recs.append(
                {
                    "category": "general",
                    "title": "Dataset ready for applications",
                    "body": "Quality validated. Proceed to dashboards and executive insights.",
                    "priority": "low",
                }
            )
        return recs

    def get_context(self, *, dataset_id, user) -> ContextBundle:
        from apps.core.exceptions import NotFoundError

        self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        bundle = ContextBundle.objects.filter(dataset_id=dataset_id).order_by("-version").first()
        if not bundle:
            raise NotFoundError("Context bundle not found")
        return bundle

    def get_graph(self, *, dataset_id, user) -> dict:
        self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        nodes = KnowledgeGraphNode.objects.filter(dataset_id=dataset_id)
        edges = KnowledgeGraphEdge.objects.filter(dataset_id=dataset_id).select_related(
            "source_node", "target_node"
        )
        return {
            "nodes": [
                {"id": str(n.id), "type": n.entity_type, "key": n.entity_key, "label": n.label}
                for n in nodes
            ],
            "edges": [
                {
                    "source": str(e.source_node_id),
                    "target": str(e.target_node_id),
                    "relationship": e.relationship,
                    "weight": e.weight,
                }
                for e in edges
            ],
        }

    def seed_industry_models(self) -> int:
        return 0  # seeded via tests or admin

    def run_enrich_for_job(self, *, job) -> dict:
        dataset_id = (job.payload or {}).get("dataset_id")
        if not dataset_id:
            raise ValueError("dataset_id required")
        return self.enrich_dataset(dataset_id=dataset_id, actor=job.created_by)
