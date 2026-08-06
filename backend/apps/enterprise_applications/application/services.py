"""Enterprise application orchestration — Track 13 (no business logic duplication)."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.business_rules.infrastructure.models import KPIResult
from apps.core.dataset_context import load_dataset_context, require_quality_gate
from apps.core.exceptions import NotFoundError, ValidationError
from apps.datasets.application.services import DatasetService
from apps.enterprise_applications.infrastructure.models import (
    DecisionCase,
    ExecutiveBriefSchedule,
    JourneyDefinition,
    ReportTemplate,
    ScheduledReport,
)
from apps.intelligence.infrastructure.models import ContextBundle, Recommendation
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

INSIGHT_JOB = "enterprise_applications.insight_bundle"
BRIEF_JOB = "enterprise_applications.executive_brief"
REPORT_JOB = "enterprise_applications.report_generate"

JOURNEY_TEMPLATES = [
    {
        "name": "Customer Journey",
        "journey_type": "customer",
        "industry": "retail",
        "stages": ["Lead", "Marketing", "Sales", "Invoice", "Payment", "Renewal"],
        "stage_column": "stage",
    },
    {
        "name": "Order Journey",
        "journey_type": "order",
        "industry": "retail",
        "stages": ["Order", "Fulfillment", "Delivery", "Complete"],
        "stage_column": "status",
    },
]


class ApplicationServiceBase:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.datasets = DatasetService()


class InsightService(ApplicationServiceBase):
    """Executive / dashboard insight bundles from platform APIs."""

    def build_insight_bundle(self, *, dataset_id, user=None, actor=None, include_ai: bool = False) -> dict:
        actor = actor or user
        if user:
            dataset = self.datasets._get(dataset_id=dataset_id, user=user, permission="dataset:read")
        else:
            from apps.datasets.infrastructure.models import Dataset

            dataset = Dataset.objects.get(id=dataset_id)

        ctx = load_dataset_context(dataset_id)
        require_quality_gate(ctx, min_score=50.0)

        from apps.business_rules.application.services import BusinessRulesService
        from apps.analytics.infrastructure.models import AnalyticsResult
        from apps.governance.application.services import GovernanceService
        from apps.enterprise_services.application.services import EnterpriseServicesService

        rules = BusinessRulesService().evaluate_dataset(
            dataset_id=dataset_id, actor=actor, require_quality=True
        )
        kpis = list(
            KPIResult.objects.filter(dataset_id=dataset_id).order_by("-created_at")[:20]
        )
        analytics = list(
            AnalyticsResult.objects.filter(dataset_id=dataset_id).order_by("-created_at")[:15]
        )
        bundle = ContextBundle.objects.filter(dataset_id=dataset_id).order_by("-version").first()
        recommendations = list(
            Recommendation.objects.filter(dataset_id=dataset_id).order_by("-priority")[:10]
        )

        gov_dashboard = None
        if user:
            gov_dashboard = GovernanceService().get_dashboard(
                organization_id=dataset.organization_id, user=user
            )

        if user:
            config = EnterpriseServicesService().get_configuration(
                organization_id=dataset.organization_id, user=user
            )
        else:
            config = None

        insight = {
            "dataset_id": str(dataset.id),
            "dataset_name": dataset.name,
            "organization_id": str(dataset.organization_id),
            "workspace_id": str(dataset.workspace_id),
            "computed_at": timezone.now().isoformat(),
            "kpis": [
                {
                    "name": r.kpi.name if hasattr(r, "kpi") else "KPI",
                    "value": r.value,
                    "status": r.status,
                    "variance_pct": r.variance_pct,
                }
                for r in kpis
            ],
            "business_rules": rules,
            "analytics": [
                {"operation": a.operation, "method": a.method, "result": a.result}
                for a in analytics
            ],
            "context": bundle.bundle if bundle else {},
            "recommendations": [
                {
                    "category": r.category,
                    "title": r.title,
                    "body": r.body,
                    "priority": r.priority,
                }
                for r in recommendations
            ],
            "governance": gov_dashboard,
            "configuration": {
                "currency": config.currency if config else "USD",
                "timezone": config.timezone if config else "UTC",
                "industry_profile": config.industry_profile if config else "",
            },
            "quality_score": ctx["quality_report"].overall_score if ctx.get("quality_report") else None,
        }

        if include_ai and actor:
            from apps.ai_platform.application.services import AIPlatformService

            reasoning = AIPlatformService().reason_over_verified(
                dataset_id=dataset_id,
                actor=actor,
                operation="narrative",
                question="Provide an executive summary of verified KPIs and risks.",
            )
            insight["executive_brief"] = reasoning

        if actor:
            self.audit.record(
                actor=actor,
                action="enterprise_applications.insight_bundle",
                resource_type="dataset",
                resource_id=dataset.id,
                organization_id=dataset.organization_id,
            )
        return insight

    def run_insight_for_job(self, job) -> dict:
        payload = job.payload or {}
        return self.build_insight_bundle(
            dataset_id=payload.get("dataset_id"),
            actor=job.created_by,
            include_ai=payload.get("include_ai", False),
        )

    @transaction.atomic
    def schedule_brief(
        self,
        *,
        dataset_id,
        user,
        frequency: str = ExecutiveBriefSchedule.Frequency.DAILY,
    ):
        dataset = self.datasets._get(dataset_id=dataset_id, user=user, permission="applications:write")
        schedule, created = ExecutiveBriefSchedule.objects.update_or_create(
            organization_id=dataset.organization_id,
            dataset=dataset,
            defaults={
                "workspace_id": dataset.workspace_id,
                "frequency": frequency,
                "is_active": True,
                "updated_by": user,
                "created_by": user,
            },
        )

        from apps.jobs.application.services import JobService

        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=BRIEF_JOB,
            payload={"dataset_id": str(dataset.id)},
        )
        return schedule, job

    def list_brief_schedules(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="applications:read"
        )
        return ExecutiveBriefSchedule.objects.filter(organization_id=org.id, is_active=True)

    def run_brief_for_job(self, job) -> dict:
        payload = job.payload or {}
        dataset_id = payload.get("dataset_id")
        if not dataset_id:
            raise ValidationError("dataset_id required")
        bundle = self.build_insight_bundle(
            dataset_id=dataset_id,
            actor=job.created_by,
            include_ai=True,
        )
        from apps.notifications.application.services import NotificationService

        if job.created_by_id:
            NotificationService().send(
                organization_id=job.organization_id,
                user=job.created_by,
                title="Executive brief ready",
                body=f"Brief for dataset {bundle.get('dataset_name', dataset_id)}",
                payload={"dataset_id": dataset_id, "brief": True},
            )
        from apps.enterprise_services.application.services import EnterpriseServicesService

        EnterpriseServicesService().dispatch_webhook_event(
            organization_id=job.organization_id,
            event="executive.brief.ready",
            payload={
                "dataset_id": dataset_id,
                "dataset_name": bundle.get("dataset_name"),
                "brief": bundle.get("executive_brief"),
            },
            actor=job.created_by,
        )
        ExecutiveBriefSchedule.objects.filter(
            organization_id=job.organization_id,
            dataset_id=dataset_id,
        ).update(last_run_at=timezone.now())
        return bundle

    def run_scheduled_briefs(self) -> dict:
        """Enqueue brief jobs for schedules that are due (beat worker)."""
        from datetime import timedelta

        from apps.jobs.application.services import JobService

        now = timezone.now()
        daily_cutoff = now - timedelta(days=1)
        weekly_cutoff = now - timedelta(days=7)
        schedules = ExecutiveBriefSchedule.objects.filter(is_active=True).select_related("dataset")
        enqueued = []
        job_service = JobService()
        for schedule in schedules:
            due = schedule.last_run_at is None
            if not due and schedule.frequency == ExecutiveBriefSchedule.Frequency.DAILY:
                due = schedule.last_run_at < daily_cutoff
            elif not due and schedule.frequency == ExecutiveBriefSchedule.Frequency.WEEKLY:
                due = schedule.last_run_at < weekly_cutoff
            if not due:
                continue
            actor = schedule.updated_by or schedule.created_by
            if not actor:
                continue
            job = job_service.enqueue(
                organization_id=schedule.organization_id,
                user=actor,
                workspace_id=schedule.workspace_id,
                job_type=BRIEF_JOB,
                payload={"dataset_id": str(schedule.dataset_id)},
            )
            enqueued.append({"schedule_id": str(schedule.id), "job_id": str(job.id)})
        return {"enqueued": len(enqueued), "jobs": enqueued}


class JourneyService(ApplicationServiceBase):
    def list_journeys(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="applications:read")
        return JourneyDefinition.objects.filter(organization_id=org.id)

    @transaction.atomic
    def create_journey(self, *, organization_id, user, **fields):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="applications:write")
        journey = JourneyDefinition.objects.create(
            organization_id=org.id,
            created_by=user,
            updated_by=user,
            **fields,
        )
        return journey

    @transaction.atomic
    def seed_templates(self, *, organization_id, user, workspace_id):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="applications:write")
        created = []
        for tpl in JOURNEY_TEMPLATES:
            j, was_created = JourneyDefinition.objects.get_or_create(
                organization_id=org.id,
                name=tpl["name"],
                defaults={
                    "workspace_id": workspace_id,
                    "journey_type": tpl["journey_type"],
                    "industry": tpl["industry"],
                    "stages": tpl["stages"],
                    "stage_column": tpl["stage_column"],
                    "is_template": True,
                    "created_by": user,
                    "updated_by": user,
                },
            )
            if was_created:
                created.append(j)
        return created

    def analyze_journey(self, *, journey_id, user, dataset_id=None):
        try:
            journey = JourneyDefinition.objects.get(id=journey_id)
        except JourneyDefinition.DoesNotExist as exc:
            raise NotFoundError("Journey not found") from exc
        self.orgs.get_for_user(organization_id=journey.organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=journey.organization_id, permission="applications:read"
        )

        ds_id = dataset_id or journey.dataset_id
        if not ds_id:
            raise ValidationError("dataset_id required for journey analysis")

        from apps.analytics.application.services import AnalyticsService
        from apps.core.dataset_context import load_dataset_context
        from apps.enterprise_applications.application.journey_analytics import (
            build_sankey_from_funnel,
            compute_drop_off,
            compute_stage_conversion,
            compute_time_in_stage,
        )

        svc = AnalyticsService()
        funnel = svc.compute(
            dataset_id=ds_id,
            operation="funnel",
            parameters={
                "stage_column": journey.stage_column,
                "stages": journey.stages,
            },
            actor=user,
        )["result"]
        cohort_col = journey.stage_column or (journey.stages[0] if journey.stages else "")
        cohort = svc.compute(
            dataset_id=ds_id,
            operation="cohort",
            parameters={"group_column": cohort_col},
            actor=user,
        )["result"]

        funnel_stages = funnel.get("stages") or []
        ctx = load_dataset_context(ds_id)
        rows = ctx.get("rows") or []

        return {
            "journey_id": str(journey.id),
            "journey_name": journey.name,
            "journey_type": journey.journey_type,
            "owner_department": journey.owner_department or "",
            "dataset_id": str(ds_id),
            "funnel": funnel,
            "cohort": cohort,
            "drop_off_analysis": compute_drop_off(funnel_stages),
            "stage_conversion": compute_stage_conversion(funnel_stages),
            "time_in_stage": compute_time_in_stage(
                rows,
                stage_column=journey.stage_column,
                stages=journey.stages or [],
                time_column=journey.time_column or None,
                entity_column=journey.entity_column or None,
            ),
            "sankey": build_sankey_from_funnel(funnel, flow_type=journey.journey_type),
        }

    def explain_journey(self, *, journey_id, user, dataset_id=None):
        analysis = self.analyze_journey(journey_id=journey_id, user=user, dataset_id=dataset_id)
        ds_id = analysis["dataset_id"]
        from apps.ai_platform.application.services import AIPlatformService

        narrative = AIPlatformService().reason_over_verified(
            dataset_id=ds_id,
            user=user,
            operation="narrative",
            question="Explain journey bottlenecks and drop-offs using verified analytics only.",
        )
        return {**analysis, "ai_explanation": narrative}


class SankeyService(ApplicationServiceBase):
    """Reusable flow visualization — consumes journey analytics APIs."""

    FLOW_LABELS = {
        "customer": "Customer Journey",
        "order": "Order Flow",
        "employee": "Employee Workflow",
        "ticket": "Ticket Lifecycle",
        "custom": "Operational Flow",
    }

    def visualize(
        self,
        *,
        user,
        journey_id=None,
        dataset_id=None,
        flow_type: str = "customer",
    ) -> dict:
        if journey_id:
            analysis = JourneyService().analyze_journey(
                journey_id=journey_id, user=user, dataset_id=dataset_id
            )
            sankey = analysis.get("sankey") or {}
            return {
                **sankey,
                "journey_id": analysis.get("journey_id"),
                "dataset_id": analysis.get("dataset_id"),
                "flow_label": self.FLOW_LABELS.get(
                    analysis.get("journey_type", flow_type), "Flow"
                ),
            }

        if not dataset_id:
            raise ValidationError("journey_id or dataset_id required")

        from apps.enterprise_applications.application.journey_analytics import build_sankey_from_funnel
        from apps.analytics.application.services import AnalyticsService

        template = JOURNEY_TEMPLATES[0] if flow_type == "customer" else JOURNEY_TEMPLATES[1]
        funnel = AnalyticsService().compute(
            dataset_id=dataset_id,
            operation="funnel",
            parameters={
                "stage_column": template["stage_column"],
                "stages": template["stages"],
            },
            actor=user,
        )["result"]
        sankey = build_sankey_from_funnel(funnel, flow_type=flow_type)
        return {
            **sankey,
            "dataset_id": str(dataset_id),
            "flow_label": self.FLOW_LABELS.get(flow_type, "Flow"),
        }


class DecisionService(ApplicationServiceBase):
    def _run_analytics_for_decision(self, *, dataset_id, actor) -> dict:
        from apps.analytics.application.services import AnalyticsService

        svc = AnalyticsService()
        out: dict = {}
        for op in ("statistics", "anomaly"):
            try:
                out[op] = svc.compute(
                    dataset_id=dataset_id,
                    operation=op,
                    parameters={},
                    actor=actor,
                )["result"]
            except Exception:  # noqa: BLE001
                out[op] = None
        return out

    @transaction.atomic
    def analyze_problem(self, *, dataset_id, user, problem: str) -> dict:
        dataset = self.datasets._get(dataset_id=dataset_id, user=user, permission="dataset:read")
        self.permissions.require(
            user=user, organization_id=dataset.organization_id, permission="applications:read"
        )

        from apps.business_rules.application.services import BusinessRulesService
        from apps.intelligence.application.services import IntelligenceService
        from apps.ai_platform.application.services import AIPlatformService
        from apps.enterprise_applications.application.decision_reasoning import (
            assemble_decision_support,
            build_reasoning_chain,
        )

        rules_eval = BusinessRulesService().evaluate_dataset(
            dataset_id=dataset_id, actor=user, require_quality=True
        )
        analytics_results = self._run_analytics_for_decision(dataset_id=dataset_id, actor=user)
        intelligence = IntelligenceService().enrich_dataset(dataset_id=dataset_id, actor=user)
        insight = InsightService().build_insight_bundle(
            dataset_id=dataset_id, user=user, include_ai=False
        )

        ai_narrative = AIPlatformService().reason_over_verified(
            dataset_id=dataset_id,
            user=user,
            operation="decisions",
            question=(
                f"Executive decision support for: {problem}. "
                "Summarize root causes, risks, and recommended actions using verified facts only."
            ),
        )

        decision_support = assemble_decision_support(
            problem=problem,
            insight=insight,
            rules_eval=rules_eval,
            analytics=analytics_results,
            intelligence=intelligence,
            ai_narrative=ai_narrative,
            dataset_id=str(dataset.id),
        )
        reasoning_chain = build_reasoning_chain(
            problem=problem,
            rules_eval=rules_eval,
            analytics=analytics_results,
            intelligence=intelligence,
            insight=insight,
        )

        result_bundle = {
            "decision_support": decision_support,
            "reasoning_chain": reasoning_chain,
            "insight": insight,
            "explanation": ai_narrative,
        }

        case = DecisionCase.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            problem=problem,
            status="completed",
            result_bundle=result_bundle,
            created_by=user,
            updated_by=user,
        )

        self.audit.record(
            actor=user,
            action="applications.decision_analyzed",
            resource_type="decision_case",
            resource_id=str(case.id),
            organization_id=dataset.organization_id,
        )

        return {
            "case_id": str(case.id),
            "problem": problem,
            "decision_support": decision_support,
            "reasoning_chain": reasoning_chain,
            "insight": insight,
            "explanation": ai_narrative,
        }

    def get_case(self, *, case_id, user) -> DecisionCase:
        try:
            case = DecisionCase.objects.select_related("dataset").get(id=case_id)
        except DecisionCase.DoesNotExist as exc:
            raise NotFoundError("Decision case not found") from exc
        self.orgs.get_for_user(organization_id=case.organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=case.organization_id, permission="applications:read"
        )
        return case

    def list_cases(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="applications:read"
        )
        return DecisionCase.objects.filter(organization_id=org.id)


class ForecastStudioService(ApplicationServiceBase):
    def run_scenarios(self, *, dataset_id, user, horizon: int = 7) -> dict:
        dataset = self.datasets._get(dataset_id=dataset_id, user=user, permission="dataset:read")
        from apps.analytics.application.services import AnalyticsService

        svc = AnalyticsService()
        base = svc.compute(
            dataset_id=dataset_id,
            operation="forecast",
            parameters={"horizon": horizon},
            actor=user,
        )["result"]
        best = svc.compute(
            dataset_id=dataset_id,
            operation="forecast",
            parameters={"horizon": horizon, "scenario": "best"},
            actor=user,
        )["result"]
        worst = svc.compute(
            dataset_id=dataset_id,
            operation="forecast",
            parameters={"horizon": horizon, "scenario": "worst"},
            actor=user,
        )["result"]
        from apps.ai_platform.application.services import AIPlatformService

        narrative = AIPlatformService().reason_over_verified(
            dataset_id=dataset_id,
            user=user,
            operation="narrative",
            question="Explain forecast scenarios for executives using verified analytics.",
        )
        return {
            "dataset_id": str(dataset.id),
            "scenarios": {
                "expected": base,
                "best_case": best,
                "worst_case": worst,
            },
            "narrative": narrative,
        }


class ReportingService(ApplicationServiceBase):
    REPORT_TYPES = [choice[0] for choice in ReportTemplate.ReportType.choices]

    def list_report_types(self) -> list[dict]:
        return [{"type": t, "label": t.replace("_", " ").title()} for t in self.REPORT_TYPES]

    def _sections_for_type(self, report_type: str) -> list[str]:
        mapping = {
            "board": ["kpis", "governance", "narrative", "recommendations"],
            "executive": ["kpis", "analytics", "recommendations", "narrative"],
            "operational": ["kpis", "analytics", "quality"],
            "department": ["kpis", "recommendations"],
            "financial": ["kpis", "analytics"],
            "compliance": ["governance", "recommendations", "narrative"],
        }
        return mapping.get(report_type, ["kpis", "analytics", "recommendations"])

    def list_templates(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="applications:read"
        )
        return ReportTemplate.objects.filter(organization_id=org.id)

    @transaction.atomic
    def generate_report(self, *, dataset_id, user, report_type: str = "executive") -> dict:
        if report_type not in self.REPORT_TYPES:
            raise ValidationError(f"Invalid report_type: {report_type}")
        dataset = self.datasets._get(dataset_id=dataset_id, user=user, permission="dataset:read")
        insight = InsightService().build_insight_bundle(
            dataset_id=dataset_id, user=user, include_ai=True
        )
        sections = self._sections_for_type(report_type)
        template, _ = ReportTemplate.objects.get_or_create(
            organization_id=dataset.organization_id,
            name=f"{report_type} Report",
            report_type=report_type,
            defaults={
                "workspace_id": dataset.workspace_id,
                "sections": sections,
                "created_by": user,
                "updated_by": user,
            },
        )
        template.sections = sections
        template.save(update_fields=["sections", "updated_at"])
        return {
            "template_id": str(template.id),
            "report_type": report_type,
            "dataset_id": str(dataset.id),
            "sections": template.sections,
            "content": insight,
            "markdown": self._to_markdown(insight, report_type),
            "html": self._to_html(insight, report_type),
            "slides": self._to_slides(insight, report_type),
            "generated_at": timezone.now().isoformat(),
        }

    @transaction.atomic
    def schedule_report(
        self,
        *,
        dataset_id,
        user,
        report_type: str = "executive",
        frequency: str = ScheduledReport.Frequency.DAILY,
    ):
        if report_type not in self.REPORT_TYPES:
            raise ValidationError(f"Invalid report_type: {report_type}")
        dataset = self.datasets._get(dataset_id=dataset_id, user=user, permission="applications:write")
        schedule, _ = ScheduledReport.objects.update_or_create(
            organization_id=dataset.organization_id,
            dataset=dataset,
            report_type=report_type,
            defaults={
                "workspace_id": dataset.workspace_id,
                "frequency": frequency,
                "is_active": True,
                "updated_by": user,
                "created_by": user,
            },
        )
        from apps.jobs.application.services import JobService

        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=REPORT_JOB,
            payload={"dataset_id": str(dataset.id), "report_type": report_type},
        )
        return schedule, job

    def list_scheduled_reports(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="applications:read"
        )
        return ScheduledReport.objects.filter(organization_id=org.id, is_active=True)

    def run_scheduled_reports(self) -> dict:
        from datetime import timedelta

        from apps.jobs.application.services import JobService

        now = timezone.now()
        daily_cutoff = now - timedelta(days=1)
        weekly_cutoff = now - timedelta(days=7)
        schedules = ScheduledReport.objects.filter(is_active=True).select_related("dataset")
        enqueued = []
        job_service = JobService()
        for schedule in schedules:
            due = schedule.last_run_at is None
            if not due and schedule.frequency == ScheduledReport.Frequency.DAILY:
                due = schedule.last_run_at < daily_cutoff
            elif not due and schedule.frequency == ScheduledReport.Frequency.WEEKLY:
                due = schedule.last_run_at < weekly_cutoff
            if not due:
                continue
            actor = schedule.updated_by or schedule.created_by
            if not actor:
                continue
            job = job_service.enqueue(
                organization_id=schedule.organization_id,
                user=actor,
                workspace_id=schedule.workspace_id,
                job_type=REPORT_JOB,
                payload={
                    "dataset_id": str(schedule.dataset_id),
                    "report_type": schedule.report_type,
                },
            )
            enqueued.append({"schedule_id": str(schedule.id), "job_id": str(job.id)})
        return {"enqueued": len(enqueued), "jobs": enqueued}

    def _to_markdown(self, insight: dict, report_type: str) -> str:
        lines = [
            f"# {report_type.title()} Report",
            f"**Dataset:** {insight.get('dataset_name', '')}",
            f"**Generated:** {insight.get('computed_at', '')}",
            "",
            "## KPIs",
        ]
        for k in insight.get("kpis") or []:
            lines.append(f"- {k.get('name')}: {k.get('value')} ({k.get('status')})")
        lines.append("")
        lines.append("## Recommendations")
        for r in insight.get("recommendations") or []:
            lines.append(f"- **{r.get('title')}**: {r.get('body')}")
        brief = insight.get("executive_brief")
        if brief:
            lines.append("")
            lines.append("## Executive Narrative")
            lines.append(str(brief.get("result", brief)))
        return "\n".join(lines)

    def _to_html(self, insight: dict, report_type: str) -> str:
        md = self._to_markdown(insight, report_type)
        body_lines = []
        for line in md.splitlines():
            if line.startswith("# "):
                body_lines.append(f"<h1>{line[2:]}</h1>")
            elif line.startswith("## "):
                body_lines.append(f"<h2>{line[3:]}</h2>")
            elif line.startswith("- "):
                body_lines.append(f"<li>{line[2:]}</li>")
            elif line.strip():
                body_lines.append(f"<p>{line}</p>")
        return (
            "<!DOCTYPE html><html><head><meta charset='utf-8'>"
            "<title>Report</title><style>"
            "body{font-family:system-ui,sans-serif;margin:2rem;line-height:1.5}"
            "h1{font-size:1.5rem}h2{font-size:1.1rem;margin-top:1.5rem}"
            "li{margin:0.25rem 0}</style></head><body>"
            + "\n".join(body_lines)
            + "</body></html>"
        )

    def _to_slides(self, insight: dict, report_type: str) -> list:
        slides = [
            {
                "title": f"{report_type.title()} Report",
                "bullets": [
                    f"Dataset: {insight.get('dataset_name', '')}",
                    f"Generated: {insight.get('computed_at', '')}",
                ],
            },
            {
                "title": "KPIs",
                "bullets": [
                    f"{k.get('name')}: {k.get('value')} ({k.get('status')})"
                    for k in (insight.get("kpis") or [])
                ],
            },
            {
                "title": "Recommendations",
                "bullets": [r.get("title", "") for r in (insight.get("recommendations") or [])],
            },
        ]
        brief = insight.get("executive_brief")
        if brief:
            slides.append(
                {
                    "title": "Executive Narrative",
                    "bullets": [str(brief.get("result", brief))],
                }
            )
        return slides

    def run_report_for_job(self, job) -> dict:
        payload = job.payload or {}
        report = self.generate_report(
            dataset_id=payload.get("dataset_id"),
            user=job.created_by,
            report_type=payload.get("report_type", "executive"),
        )
        ScheduledReport.objects.filter(
            organization_id=job.organization_id,
            dataset_id=payload.get("dataset_id"),
            report_type=payload.get("report_type", "executive"),
        ).update(last_run_at=timezone.now())
        from apps.enterprise_services.application.services import EnterpriseServicesService

        EnterpriseServicesService().dispatch_webhook_event(
            organization_id=job.organization_id,
            event="enterprise.report.ready",
            payload={
                "dataset_id": payload.get("dataset_id"),
                "report_type": payload.get("report_type", "executive"),
            },
            actor=job.created_by,
        )
        if job.created_by_id:
            from apps.notifications.application.services import NotificationService

            NotificationService().send(
                organization_id=job.organization_id,
                user=job.created_by,
                title="Enterprise report ready",
                body=f"{report.get('report_type')} report generated",
                payload={"dataset_id": payload.get("dataset_id"), "report": True},
            )
        return report


class OperationalService(ApplicationServiceBase):
    def get_ops_dashboard(self, *, organization_id, user) -> dict:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="applications:read"
        )
        from apps.jobs.infrastructure.models import Job
        from apps.quality.infrastructure.models import QualityRun

        jobs = Job.objects.filter(organization_id=org.id).order_by("-created_at")[:50]
        failed = sum(1 for j in jobs if j.status == "failed")
        running = sum(1 for j in jobs if j.status == "running")
        quality_issues = QualityRun.objects.filter(
            organization_id=org.id, status=QualityRun.Status.FAILED
        ).count()

        from apps.governance.application.services import GovernanceService

        gov = GovernanceService().get_dashboard(organization_id=org.id, user=user)
        return {
            "job_health": {
                "recent": len(jobs),
                "failed": failed,
                "running": running,
            },
            "quality_failures": quality_issues,
            "governance": gov,
        }
