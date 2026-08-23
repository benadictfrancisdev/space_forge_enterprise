"""Enterprise Execution Engine — Track 6 job orchestration."""
from __future__ import annotations

from uuid import UUID

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, PermissionDeniedError, ValidationError
from apps.core.tenancy import resource_exists_in_org
from apps.jobs.infrastructure.models import Job
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

# Long-running job types owned by the execution engine
PIPELINE_JOB_TYPE = "dataset.pipeline"
SUPPORTED_JOB_TYPES = {
    "platform.ping",
    "dataset.profile",
    "ai.compute",
    "connector.test",
    "connector.discover",
    "connector.sync",
    "data_platform.pipeline",
    "metadata.extract",
    "quality.validate",
    "business_rules.evaluate",
    "analytics.compute",
    "intelligence.enrich",
    "track12.wave2",
    "ai_platform.reason",
    "ai_platform.embed",
    "ai_platform.rag",
    "query_compute.execute",
    "track12.wave3",
    "governance.evaluate",
    "governance.classify",
    "governance.delete_request",
    "governance.lineage",
    "enterprise_services.search_reindex",
    "enterprise_services.meter",
    "track12.wave4",
    "enterprise_applications.insight_bundle",
    "enterprise_applications.report_generate",
    "enterprise_applications.executive_brief",
    PIPELINE_JOB_TYPE,
}

# Payload keys validated only when present (optional references).
_OPTIONAL_PAYLOAD_KEYS = frozenset(
    {
        "sync_run_id",
        "pipeline_run_id",
        "quality_run_id",
        "analytics_run_id",
        "source_storage_object_id",
        "execution_id",
        "resource_id",
        "plan_id",
    }
)

_GOVERNANCE_RESOURCE_MODELS = {
    "dataset": "apps.datasets.infrastructure.models.Dataset",
    "connection": "apps.integrations.infrastructure.models.Connection",
    "storage_object": "apps.storage.infrastructure.models.StorageObject",
}


def _import_model(dotted_path: str):
    module_path, class_name = dotted_path.rsplit(".", 1)
    module = __import__(module_path, fromlist=[class_name])
    return getattr(module, class_name)


def _validate_payload_field(
    *,
    organization_id: UUID,
    field_name: str,
    model_path: str,
    resource_id,
) -> None:
    if field_name in _OPTIONAL_PAYLOAD_KEYS and not resource_id:
        return
    if not resource_id:
        raise ValidationError(f"{field_name} is required in job payload")
    model = _import_model(model_path)
    if not resource_exists_in_org(model, resource_id=resource_id, organization_id=organization_id):
        raise PermissionDeniedError("Referenced resource does not belong to this organization")


def validate_job_payload(job_type: str, payload: dict, organization_id: UUID) -> None:
    """Ensure payload resource IDs belong to the calling organization."""
    payload = payload or {}
    org_id = organization_id

    if job_type in {
        "platform.ping",
        "ai.compute",
        "enterprise_services.search_reindex",
        "enterprise_services.meter",
    }:
        return

    if job_type in {"connector.test", "connector.discover"}:
        _validate_payload_field(
            organization_id=org_id,
            field_name="connection_id",
            model_path="apps.integrations.infrastructure.models.Connection",
            resource_id=payload.get("connection_id"),
        )
        return

    if job_type == "connector.sync":
        _validate_payload_field(
            organization_id=org_id,
            field_name="connection_id",
            model_path="apps.integrations.infrastructure.models.Connection",
            resource_id=payload.get("connection_id"),
        )
        _validate_payload_field(
            organization_id=org_id,
            field_name="sync_run_id",
            model_path="apps.integrations.infrastructure.models.SyncRun",
            resource_id=payload.get("sync_run_id"),
        )
        return

    dataset_job_types = {
        "dataset.profile",
        "dataset.pipeline",
        "metadata.extract",
        "business_rules.evaluate",
        "intelligence.enrich",
        "track12.wave2",
        "track12.wave3",
        "track12.wave4",
        "ai_platform.reason",
        "ai_platform.embed",
        "governance.classify",
        "governance.delete_request",
        "governance.lineage",
        "enterprise_applications.insight_bundle",
        "enterprise_applications.report_generate",
        "enterprise_applications.executive_brief",
    }
    if job_type in dataset_job_types:
        _validate_payload_field(
            organization_id=org_id,
            field_name="dataset_id",
            model_path="apps.datasets.infrastructure.models.Dataset",
            resource_id=payload.get("dataset_id"),
        )
        return

    if job_type == "data_platform.pipeline":
        _validate_payload_field(
            organization_id=org_id,
            field_name="dataset_id",
            model_path="apps.datasets.infrastructure.models.Dataset",
            resource_id=payload.get("dataset_id"),
        )
        _validate_payload_field(
            organization_id=org_id,
            field_name="source_storage_object_id",
            model_path="apps.storage.infrastructure.models.StorageObject",
            resource_id=payload.get("source_storage_object_id"),
        )
        _validate_payload_field(
            organization_id=org_id,
            field_name="pipeline_run_id",
            model_path="apps.data_platform.infrastructure.models.PipelineRun",
            resource_id=payload.get("pipeline_run_id"),
        )
        return

    if job_type == "quality.validate":
        _validate_payload_field(
            organization_id=org_id,
            field_name="dataset_id",
            model_path="apps.datasets.infrastructure.models.Dataset",
            resource_id=payload.get("dataset_id"),
        )
        _validate_payload_field(
            organization_id=org_id,
            field_name="quality_run_id",
            model_path="apps.quality.infrastructure.models.QualityRun",
            resource_id=payload.get("quality_run_id"),
        )
        return

    if job_type == "analytics.compute":
        _validate_payload_field(
            organization_id=org_id,
            field_name="dataset_id",
            model_path="apps.datasets.infrastructure.models.Dataset",
            resource_id=payload.get("dataset_id"),
        )
        _validate_payload_field(
            organization_id=org_id,
            field_name="analytics_run_id",
            model_path="apps.analytics.infrastructure.models.AnalyticsRun",
            resource_id=payload.get("analytics_run_id"),
        )
        return

    if job_type == "query_compute.execute":
        _validate_payload_field(
            organization_id=org_id,
            field_name="dataset_id",
            model_path="apps.datasets.infrastructure.models.Dataset",
            resource_id=payload.get("dataset_id"),
        )
        _validate_payload_field(
            organization_id=org_id,
            field_name="execution_id",
            model_path="apps.query_compute.infrastructure.models.QueryExecution",
            resource_id=payload.get("execution_id"),
        )
        return

    if job_type == "ai_platform.rag":
        _validate_payload_field(
            organization_id=org_id,
            field_name="dataset_id",
            model_path="apps.datasets.infrastructure.models.Dataset",
            resource_id=payload.get("dataset_id"),
        )
        if not payload.get("query"):
            raise ValidationError("query is required in job payload")
        return

    if job_type == "governance.evaluate":
        resource_type = (payload.get("resource_type") or "").lower()
        resource_id = payload.get("resource_id")
        if resource_type and resource_id:
            model_path = _GOVERNANCE_RESOURCE_MODELS.get(resource_type)
            if model_path:
                _validate_payload_field(
                    organization_id=org_id,
                    field_name="resource_id",
                    model_path=model_path,
                    resource_id=resource_id,
                )
        return


class JobService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()

    def _get(self, *, job_id, user) -> Job:
        try:
            job = Job.objects.get(id=job_id)
        except Job.DoesNotExist as exc:
            raise NotFoundError("Job not found") from exc
        self.orgs.get_for_user(organization_id=job.organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=job.organization_id, permission="job:read"
        )
        return job

    @transaction.atomic
    def enqueue(
        self,
        *,
        organization_id,
        user,
        job_type: str,
        payload: dict | None = None,
        workspace_id=None,
        priority: int = Job.Priority.NORMAL,
        timeout_seconds: int = 300,
        max_retries: int = 3,
    ) -> Job:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="job:create")
        if job_type not in SUPPORTED_JOB_TYPES:
            raise ValidationError(f"Unsupported job type: {job_type}")
        validate_job_payload(job_type, payload or {}, org.id)
        job = Job.objects.create(
            organization_id=org.id,
            workspace_id=workspace_id,
            job_type=job_type,
            payload=payload or {},
            priority=priority,
            timeout_seconds=timeout_seconds,
            max_retries=max_retries,
            status_message="queued",
            created_by=user,
            updated_by=user,
        )
        from workers.tasks import execute_platform_job

        async_result = execute_platform_job.apply_async(
            args=[str(job.id)],
            priority=min(9, max(0, int(priority))),
            soft_time_limit=timeout_seconds,
            time_limit=timeout_seconds + 30,
        )
        job.celery_task_id = async_result.id or ""
        job.save(update_fields=["celery_task_id", "updated_at"])
        # Eager mode mutates the row in-worker; refresh so the API reflects final state.
        job.refresh_from_db()
        self.audit.record(
            actor=user,
            action="job.enqueued",
            resource_type="job",
            resource_id=str(job.id),
            organization_id=org.id,
            after={"job_type": job_type, "priority": priority, "status": job.status},
        )
        return job

    def list(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="job:read")
        return Job.objects.filter(organization_id=org.id).order_by("-priority", "-created_at")

    def get(self, *, job_id, user) -> Job:
        return self._get(job_id=job_id, user=user)

    def mark_running(self, job: Job) -> Job:
        job.status = Job.Status.RUNNING
        job.started_at = timezone.now()
        job.attempt_count = (job.attempt_count or 0) + 1
        job.progress_pct = max(job.progress_pct or 0, 1)
        job.status_message = "running"
        job.save(
            update_fields=[
                "status",
                "started_at",
                "attempt_count",
                "progress_pct",
                "status_message",
                "updated_at",
            ]
        )
        return job

    def update_progress(self, job: Job, *, progress_pct: int, message: str = "") -> Job:
        job.refresh_from_db()
        if job.cancel_requested or job.status == Job.Status.CANCELLED:
            return job
        job.progress_pct = max(0, min(100, int(progress_pct)))
        if message:
            job.status_message = message[:255]
        job.save(update_fields=["progress_pct", "status_message", "updated_at"])
        return job

    def mark_succeeded(self, job: Job, result: dict | None = None) -> Job:
        job.status = Job.Status.SUCCEEDED
        job.result = result or {}
        job.finished_at = timezone.now()
        job.progress_pct = 100
        job.status_message = "succeeded"
        if job.started_at:
            job.execution_ms = int((job.finished_at - job.started_at).total_seconds() * 1000)
        job.save(
            update_fields=[
                "status",
                "result",
                "finished_at",
                "progress_pct",
                "status_message",
                "execution_ms",
                "updated_at",
            ]
        )
        return job

    def mark_failed(self, job: Job, error: str) -> Job:
        job.status = Job.Status.FAILED
        job.error = error
        job.finished_at = timezone.now()
        job.status_message = "failed"
        if job.started_at:
            job.execution_ms = int((job.finished_at - job.started_at).total_seconds() * 1000)
        job.save(
            update_fields=[
                "status",
                "error",
                "finished_at",
                "status_message",
                "execution_ms",
                "updated_at",
            ]
        )
        return job

    def mark_cancelled(self, job: Job, reason: str = "cancelled by user") -> Job:
        job.status = Job.Status.CANCELLED
        job.cancel_requested = True
        job.error = reason
        job.finished_at = timezone.now()
        job.status_message = "cancelled"
        if job.started_at:
            job.execution_ms = int((job.finished_at - job.started_at).total_seconds() * 1000)
        job.save(
            update_fields=[
                "status",
                "cancel_requested",
                "error",
                "finished_at",
                "status_message",
                "execution_ms",
                "updated_at",
            ]
        )
        return job

    def request_cancel(self, *, job_id, user) -> Job:
        job = self._get(job_id=job_id, user=user)
        self.permissions.require(
            user=user, organization_id=job.organization_id, permission="job:create"
        )
        if job.status in {Job.Status.SUCCEEDED, Job.Status.FAILED, Job.Status.CANCELLED}:
            raise ValidationError(f"Cannot cancel job in status {job.status}")
        job.cancel_requested = True
        job.status_message = "cancel_requested"
        job.save(update_fields=["cancel_requested", "status_message", "updated_at"])
        # Best-effort revoke Celery task
        if job.celery_task_id:
            try:
                from workers.celery_app import app as celery_app

                celery_app.control.revoke(job.celery_task_id, terminate=True)
            except Exception:  # noqa: BLE001
                pass
        if job.status == Job.Status.QUEUED:
            return self.mark_cancelled(job)
        self.audit.record(
            actor=user,
            action="job.cancel_requested",
            resource_type="job",
            resource_id=str(job.id),
            organization_id=job.organization_id,
        )
        return job

    def retry(self, *, job_id, user) -> Job:
        job = self._get(job_id=job_id, user=user)
        self.permissions.require(
            user=user, organization_id=job.organization_id, permission="job:create"
        )
        if job.status not in {Job.Status.FAILED, Job.Status.CANCELLED}:
            raise ValidationError("Only failed or cancelled jobs can be retried")
        if job.attempt_count >= job.max_retries:
            raise ValidationError("Max retries exceeded")
        return self.enqueue(
            organization_id=job.organization_id,
            user=user,
            job_type=job.job_type,
            payload=job.payload,
            workspace_id=job.workspace_id,
            priority=job.priority,
            timeout_seconds=job.timeout_seconds,
            max_retries=job.max_retries,
        )

    def is_cancelled(self, job: Job) -> bool:
        job.refresh_from_db(fields=["cancel_requested", "status"])
        return bool(job.cancel_requested or job.status == Job.Status.CANCELLED)
