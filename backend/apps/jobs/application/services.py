"""Enterprise Execution Engine — Track 6 job orchestration."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, ValidationError
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
