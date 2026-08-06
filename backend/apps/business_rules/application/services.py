"""Business Rules Platform services — Track 12.4."""
from __future__ import annotations

from django.db import transaction

from apps.audit.application.services import AuditService
from apps.business_rules.application.engines import (
    run_financial_engine,
    run_kpi_engine,
    run_policy_engine,
    run_rule_engine,
    run_validation_engine,
)
from apps.business_rules.infrastructure.models import (
    BusinessRule,
    FinancialSnapshot,
    KPIDefinition,
    KPIResult,
    Policy,
    PolicyEvaluation,
    RuleEvaluation,
)
from apps.core.dataset_context import load_dataset_context, require_quality_gate
from apps.core.exceptions import NotFoundError, ValidationError
from apps.datasets.application.services import DatasetService
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

EVALUATE_JOB = "business_rules.evaluate"


class BusinessRulesService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.datasets = DatasetService()

    def _get_dataset(self, *, dataset_id, user, permission: str):
        return self.datasets._get(dataset_id=dataset_id, user=user, permission=permission)

    def list_kpis(self, *, organization_id, user, workspace_id=None):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:read")
        qs = KPIDefinition.objects.filter(organization_id=org.id, is_active=True)
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        return qs.order_by("name")

    @transaction.atomic
    def create_kpi(self, *, organization_id, workspace_id, user, **fields) -> KPIDefinition:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user,
            organization_id=org.id,
            permission="dataset:write",
            workspace_id=workspace_id,
        )
        return KPIDefinition.objects.create(
            organization_id=org.id,
            workspace_id=workspace_id,
            created_by=user,
            updated_by=user,
            **fields,
        )

    def list_policies(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:read")
        return Policy.objects.filter(organization_id=org.id, is_active=True)

    @transaction.atomic
    def create_policy(self, *, organization_id, workspace_id, user, **fields) -> Policy:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:write")
        return Policy.objects.create(
            organization_id=org.id,
            workspace_id=workspace_id,
            created_by=user,
            updated_by=user,
            **fields,
        )

    @transaction.atomic
    def enqueue_evaluate(self, *, dataset_id, user):
        from apps.jobs.application.services import JobService

        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=EVALUATE_JOB,
            payload={"dataset_id": str(dataset.id)},
        )
        return job

    @transaction.atomic
    def evaluate_dataset(self, *, dataset_id, actor=None, require_quality: bool = True) -> dict:
        context = load_dataset_context(dataset_id)
        if require_quality:
            require_quality_gate(context, min_score=50.0)

        dataset = context["dataset"]
        from django.db import models as django_models

        kpi_defs = list(
            KPIDefinition.objects.filter(
                organization_id=dataset.organization_id,
                is_active=True,
            ).filter(
                django_models.Q(dataset_id=dataset.id) | django_models.Q(dataset__isnull=True)
            )
        )

        kpi_results = run_kpi_engine(kpi_defs, context)
        for item in kpi_results:
            kpi = KPIDefinition.objects.get(id=item["kpi_id"])
            KPIResult.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                kpi=kpi,
                dataset=dataset,
                value=item["value"],
                target_value=item.get("target_value"),
                variance_pct=item.get("variance_pct"),
                status=item["status"],
                metadata=item,
                created_by=actor,
                updated_by=actor,
            )

        financial = run_financial_engine(context)
        FinancialSnapshot.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            metrics=financial["metrics"],
            currency=financial.get("currency", "USD"),
            created_by=actor,
            updated_by=actor,
        )

        rules = list(
            BusinessRule.objects.filter(organization_id=dataset.organization_id, is_active=True)
        )
        rule_results = run_rule_engine(rules, context)
        for item in rule_results:
            rule = BusinessRule.objects.get(id=item["rule_id"])
            RuleEvaluation.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                rule=rule,
                dataset=dataset,
                passed=item["passed"],
                result=item,
                created_by=actor,
                updated_by=actor,
            )

        policies = list(
            Policy.objects.filter(organization_id=dataset.organization_id, is_active=True)
        )
        policy_results = run_policy_engine(policies, context)
        for item in policy_results:
            policy = Policy.objects.get(id=item["policy_id"])
            PolicyEvaluation.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                policy=policy,
                dataset=dataset,
                compliant=item["compliant"],
                violations=item["violations"],
                created_by=actor,
                updated_by=actor,
            )

        validation = run_validation_engine(context)

        if actor:
            self.audit.record(
                actor=actor,
                action="business_rules.evaluated",
                resource_type="dataset",
                resource_id=str(dataset.id),
                organization_id=dataset.organization_id,
                after={"kpis": len(kpi_results), "rules": len(rule_results)},
            )

        return {
            "dataset_id": str(dataset.id),
            "kpis": kpi_results,
            "financial": financial,
            "rules": rule_results,
            "policies": policy_results,
            "validation": validation,
        }

    def run_evaluate_for_job(self, *, job) -> dict:
        dataset_id = (job.payload or {}).get("dataset_id")
        if not dataset_id:
            raise ValueError("dataset_id required")
        return self.evaluate_dataset(
            dataset_id=dataset_id,
            actor=job.created_by,
            require_quality=True,
        )
