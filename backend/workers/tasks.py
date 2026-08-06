from __future__ import annotations

import logging

from celery import shared_task
from celery.exceptions import SoftTimeLimitExceeded
from celery.utils.log import get_task_logger
from django.core.cache import cache
from django.db import transaction
from django.utils import timezone

from apps.core import metrics
from apps.platform.application.health import WORKER_HEARTBEAT_KEY

logger = get_task_logger(__name__)
app_logger = logging.getLogger("spaceforge.workers")


@shared_task(
    name="workers.execute_platform_job",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
    max_retries=3,
    acks_late=True,
)
def execute_platform_job(self, job_id: str) -> dict:
    from apps.jobs.application.pipeline import JobCancelled, run_dataset_pipeline
    from apps.jobs.application.services import JobService
    from apps.jobs.infrastructure.models import Job
    from apps.notifications.application.services import NotificationService

    try:
        job = Job.objects.get(id=job_id)
    except Job.DoesNotExist:
        app_logger.error("job_not_found", extra={"job_id": job_id})
        return {"ok": False, "error": "not_found"}

    service = JobService()
    if service.is_cancelled(job):
        service.mark_cancelled(job)
        return {"ok": False, "error": "cancelled", "job_id": job_id}

    # Honor per-job retry budget
    self.max_retries = max(0, int(job.max_retries or 0))

    service.mark_running(job)
    try:
        if service.is_cancelled(job):
            raise JobCancelled("cancel requested before start")

        if job.job_type == "dataset.profile":
            from apps.datasets.application.services import DatasetService

            service.update_progress(job, progress_pct=20, message="profiling")
            dataset_id = (job.payload or {}).get("dataset_id")
            if not dataset_id:
                raise ValueError("dataset_id required in payload")
            dataset = DatasetService().run_profile_now(dataset_id=dataset_id)
            result = {
                "dataset_id": str(dataset.id),
                "profile_status": dataset.profile_status,
                "row_count": dataset.row_count,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "dataset.pipeline":
            result = run_dataset_pipeline(job, service)
        elif job.job_type == "ai.compute":
            import sys
            from pathlib import Path

            from django.conf import settings

            root = str(Path(settings.BASE_DIR))
            if root not in sys.path:
                sys.path.insert(0, root)
            from ai_service.gateway import run_gateway

            service.update_progress(job, progress_pct=30, message="ai.compute")
            operation = (job.payload or {}).get("operation")
            if not operation:
                raise ValueError("operation required in payload")
            compute_result = run_gateway(operation, job.payload or {})
            result = {
                **compute_result,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "connector.test":
            from apps.integrations.application.connection_service import ConnectionService

            service.update_progress(job, progress_pct=30, message="connector.test")
            connection_id = (job.payload or {}).get("connection_id")
            if not connection_id:
                raise ValueError("connection_id required in payload")
            test_result = ConnectionService().run_test_for_job(connection_id=connection_id)
            result = {
                **test_result,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "connector.discover":
            from apps.integrations.application.discovery_service import DiscoveryService

            service.update_progress(job, progress_pct=30, message="connector.discover")
            connection_id = (job.payload or {}).get("connection_id")
            if not connection_id:
                raise ValueError("connection_id required in payload")
            discover_result = DiscoveryService().run_discover_for_job(
                connection_id=connection_id
            )
            result = {
                **discover_result,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "connector.sync":
            from apps.integrations.application.sync_service import SyncService

            service.update_progress(job, progress_pct=5, message="connector.sync")
            sync_result = SyncService().run_sync_for_job(job=job, job_service=service)
            result = {
                **sync_result,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "data_platform.pipeline":
            from apps.data_platform.application.services import DataPlatformService
            from apps.metadata.application.services import MetadataService
            from apps.quality.application.services import QualityService

            service.update_progress(job, progress_pct=5, message="data_platform.pipeline")
            pipeline_result = DataPlatformService().run_pipeline_for_job(job=job, job_service=service)
            dataset_id = pipeline_result.get("dataset_id")
            if dataset_id:
                service.update_progress(job, progress_pct=80, message="metadata.extract")
                meta_result = MetadataService().extract_for_dataset(
                    dataset_id=dataset_id, actor=job.created_by
                )
                service.update_progress(job, progress_pct=90, message="quality.validate")
                quality_result = QualityService().run_validate_for_job(job=job)
                pipeline_result["metadata"] = meta_result
                pipeline_result["quality"] = quality_result
                if quality_result.get("status") in ("passed", "warning"):
                    service.update_progress(job, progress_pct=92, message="track12.wave2")
                    from apps.business_rules.application.services import BusinessRulesService
                    from apps.analytics.application.services import AnalyticsService
                    from apps.intelligence.application.services import IntelligenceService

                    pipeline_result["business_rules"] = BusinessRulesService().evaluate_dataset(
                        dataset_id=dataset_id, actor=job.created_by
                    )
                    pipeline_result["analytics"] = AnalyticsService().compute_all(
                        dataset_id=dataset_id, actor=job.created_by
                    )
                    pipeline_result["intelligence"] = IntelligenceService().enrich_dataset(
                        dataset_id=dataset_id, actor=job.created_by
                    )
                    service.update_progress(job, progress_pct=95, message="track12.wave3")
                    from apps.ai_platform.application.services import AIPlatformService
                    from apps.query_compute.application.services import QueryComputeService

                    pipeline_result["ai_reasoning"] = AIPlatformService().reason_over_verified(
                        dataset_id=dataset_id,
                        actor=job.created_by,
                        operation="narrative",
                    )
                    AIPlatformService().embed_dataset(dataset_id=dataset_id, actor=job.created_by)
                    plan = None
                    if job.created_by:
                        plan = QueryComputeService().generate_plan(
                            dataset_id=dataset_id,
                            user=job.created_by,
                            natural_language="count rows",
                        )
                    sql = (
                        (plan.optimized_sql or plan.generated_sql)
                        if plan
                        else "SELECT COUNT(*) AS row_count FROM dataset"
                    )
                    pipeline_result["query_compute"] = QueryComputeService().execute_sql(
                        dataset_id=dataset_id,
                        sql=sql,
                        actor=job.created_by,
                    )
                    service.update_progress(job, progress_pct=98, message="track12.wave4")
                    from apps.governance.application.services import GovernanceService
                    from apps.enterprise_services.application.services import EnterpriseServicesService

                    gov_svc = GovernanceService()
                    es_svc = EnterpriseServicesService()
                    pipeline_result["governance"] = gov_svc.run_wave4_for_dataset(
                        dataset_id=dataset_id,
                        actor=job.created_by,
                    )
                    pipeline_result["enterprise_services"] = es_svc.run_wave4_for_organization(
                        organization_id=job.organization_id,
                        actor=job.created_by,
                    )
            result = {
                **pipeline_result,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "metadata.extract":
            from apps.metadata.application.services import MetadataService

            service.update_progress(job, progress_pct=30, message="metadata.extract")
            result = {
                **MetadataService().run_extract_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "quality.validate":
            from apps.quality.application.services import QualityService

            service.update_progress(job, progress_pct=30, message="quality.validate")
            result = {
                **QualityService().run_validate_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "business_rules.evaluate":
            from apps.business_rules.application.services import BusinessRulesService

            service.update_progress(job, progress_pct=30, message="business_rules.evaluate")
            result = {
                **BusinessRulesService().run_evaluate_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "analytics.compute":
            from apps.analytics.application.services import AnalyticsService

            service.update_progress(job, progress_pct=30, message="analytics.compute")
            result = {
                **AnalyticsService().run_compute_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "intelligence.enrich":
            from apps.intelligence.application.services import IntelligenceService

            service.update_progress(job, progress_pct=30, message="intelligence.enrich")
            result = {
                **IntelligenceService().run_enrich_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "track12.wave2":
            from apps.analytics.application.services import AnalyticsService
            from apps.business_rules.application.services import BusinessRulesService
            from apps.intelligence.application.services import IntelligenceService

            dataset_id = (job.payload or {}).get("dataset_id")
            if not dataset_id:
                raise ValueError("dataset_id required")
            service.update_progress(job, progress_pct=20, message="business_rules.evaluate")
            rules = BusinessRulesService().evaluate_dataset(
                dataset_id=dataset_id, actor=job.created_by
            )
            service.update_progress(job, progress_pct=50, message="analytics.compute")
            analytics = AnalyticsService().compute_all(dataset_id=dataset_id, actor=job.created_by)
            service.update_progress(job, progress_pct=80, message="intelligence.enrich")
            intelligence = IntelligenceService().enrich_dataset(
                dataset_id=dataset_id, actor=job.created_by
            )
            result = {
                "dataset_id": dataset_id,
                "business_rules": rules,
                "analytics": analytics,
                "intelligence": intelligence,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "ai_platform.reason":
            from apps.ai_platform.application.services import AIPlatformService

            service.update_progress(job, progress_pct=30, message="ai_platform.reason")
            result = {
                **AIPlatformService().run_reason_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "ai_platform.embed":
            from apps.ai_platform.application.services import AIPlatformService

            service.update_progress(job, progress_pct=30, message="ai_platform.embed")
            result = {
                **AIPlatformService().run_embed_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "ai_platform.rag":
            from apps.ai_platform.application.services import AIPlatformService

            service.update_progress(job, progress_pct=30, message="ai_platform.rag")
            result = {
                **AIPlatformService().run_rag_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "query_compute.execute":
            from apps.query_compute.application.services import QueryComputeService

            service.update_progress(job, progress_pct=30, message="query_compute.execute")
            result = {
                **QueryComputeService().run_execute_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "track12.wave3":
            from apps.ai_platform.application.services import AIPlatformService
            from apps.query_compute.application.services import QueryComputeService

            dataset_id = (job.payload or {}).get("dataset_id")
            if not dataset_id:
                raise ValueError("dataset_id required")
            service.update_progress(job, progress_pct=20, message="ai_platform.embed")
            AIPlatformService().embed_dataset(dataset_id=dataset_id, actor=job.created_by)
            service.update_progress(job, progress_pct=50, message="ai_platform.reason")
            reasoning = AIPlatformService().reason_over_verified(
                dataset_id=dataset_id,
                actor=job.created_by,
                operation=(job.payload or {}).get("operation", "narrative"),
            )
            service.update_progress(job, progress_pct=80, message="query_compute.execute")
            qc = QueryComputeService()
            plan = qc.generate_plan(
                dataset_id=dataset_id,
                user=job.created_by,
                natural_language="count rows",
            )
            query_result = qc.execute_sql(
                dataset_id=dataset_id,
                sql=plan.optimized_sql or plan.generated_sql,
                actor=job.created_by,
            )
            result = {
                "dataset_id": dataset_id,
                "reasoning": reasoning,
                "query": query_result,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "governance.evaluate":
            from apps.governance.application.services import GovernanceService

            service.update_progress(job, progress_pct=30, message="governance.evaluate")
            result = {
                **GovernanceService().run_evaluate_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "governance.classify":
            from apps.governance.application.services import GovernanceService

            service.update_progress(job, progress_pct=30, message="governance.classify")
            result = {
                **GovernanceService().run_classify_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "governance.delete_request":
            from apps.governance.application.services import GovernanceService

            service.update_progress(job, progress_pct=30, message="governance.delete_request")
            result = {
                **GovernanceService().run_delete_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "governance.lineage":
            from apps.governance.application.services import GovernanceService

            service.update_progress(job, progress_pct=30, message="governance.lineage")
            result = {
                **GovernanceService().run_lineage_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "enterprise_services.search_reindex":
            from apps.enterprise_services.application.services import EnterpriseServicesService

            service.update_progress(job, progress_pct=30, message="enterprise_services.search_reindex")
            result = {
                **EnterpriseServicesService().run_search_reindex_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "enterprise_services.meter":
            from apps.enterprise_services.application.services import EnterpriseServicesService

            service.update_progress(job, progress_pct=30, message="enterprise_services.meter")
            result = {
                **EnterpriseServicesService().run_meter_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "track12.wave4":
            from apps.governance.application.services import GovernanceService
            from apps.enterprise_services.application.services import EnterpriseServicesService

            dataset_id = (job.payload or {}).get("dataset_id")
            if not dataset_id:
                raise ValueError("dataset_id required")
            service.update_progress(job, progress_pct=30, message="governance.wave4")
            gov = GovernanceService().run_wave4_for_dataset(
                dataset_id=dataset_id, actor=job.created_by
            )
            service.update_progress(job, progress_pct=70, message="enterprise_services.wave4")
            es = EnterpriseServicesService().run_wave4_for_organization(
                organization_id=job.organization_id, actor=job.created_by
            )
            result = {
                "dataset_id": dataset_id,
                "governance": gov,
                "enterprise_services": es,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "enterprise_applications.insight_bundle":
            from apps.enterprise_applications.application.services import InsightService

            service.update_progress(job, progress_pct=30, message="applications.insight_bundle")
            result = {
                **InsightService().run_insight_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "enterprise_applications.report_generate":
            from apps.enterprise_applications.application.services import ReportingService

            service.update_progress(job, progress_pct=30, message="applications.report_generate")
            result = {
                **ReportingService().run_report_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        elif job.job_type == "enterprise_applications.executive_brief":
            from apps.enterprise_applications.application.services import InsightService

            service.update_progress(job, progress_pct=30, message="applications.executive_brief")
            result = {
                **InsightService().run_brief_for_job(job=job),
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
            }
        else:
            service.update_progress(job, progress_pct=50, message="echo")
            result = {
                "echo": job.payload,
                "processed_at": timezone.now().isoformat(),
                "job_type": job.job_type,
                "retries": self.request.retries,
            }

        if service.is_cancelled(job):
            raise JobCancelled("cancel requested before completion")

        service.mark_succeeded(job, result=result)
        metrics.incr("jobs_succeeded_total", job_type=job.job_type)
        if job.created_by_id:
            NotificationService().send(
                organization_id=job.organization_id,
                user=job.created_by,
                title=f"Job completed: {job.job_type}",
                body=f"Job {job.id} finished successfully.",
                payload={"job_id": str(job.id), "progress_pct": 100},
            )
        return {"ok": True, "job_id": job_id}
    except JobCancelled:
        service.mark_cancelled(job)
        if job.job_type == "connector.sync":
            try:
                from apps.integrations.application.sync_service import SyncService

                SyncService().mark_run_cancelled(job_id=job.id)
            except Exception:  # noqa: BLE001
                app_logger.exception("sync_run_mark_cancelled")
        if job.job_type == "data_platform.pipeline":
            try:
                from apps.data_platform.application.services import DataPlatformService

                DataPlatformService().mark_pipeline_failed(job_id=job.id, error="cancelled")
            except Exception:  # noqa: BLE001
                app_logger.exception("pipeline_mark_cancelled")
        metrics.incr("jobs_cancelled_total", job_type=job.job_type)
        return {"ok": False, "error": "cancelled", "job_id": job_id}
    except SoftTimeLimitExceeded:
        service.mark_failed(job, error=f"timeout after {job.timeout_seconds}s")
        metrics.incr("jobs_failed_total", job_type=job.job_type)
        return {"ok": False, "error": "timeout", "job_id": job_id}
    except Exception as exc:
        if job.job_type == "dataset.profile":
            try:
                from apps.datasets.application.services import DatasetService

                dataset_id = (job.payload or {}).get("dataset_id")
                if dataset_id:
                    DatasetService().mark_profile_failed(dataset_id=dataset_id, error=str(exc))
            except Exception:  # noqa: BLE001
                app_logger.exception("dataset_profile_mark_failed")
        # Retry if budget remains
        if self.request.retries < self.max_retries:
            service.update_progress(
                job,
                progress_pct=job.progress_pct or 0,
                message=f"retrying:{self.request.retries + 1}",
            )
            raise
        service.mark_failed(job, error=str(exc))
        metrics.incr("jobs_failed_total", job_type=job.job_type)
        if job.job_type == "connector.sync":
            try:
                from apps.integrations.application.sync_service import SyncService

                SyncService().mark_run_failed(job_id=job.id, error=str(exc))
            except Exception:  # noqa: BLE001
                app_logger.exception("sync_run_mark_failed")
        if job.job_type == "data_platform.pipeline":
            try:
                from apps.data_platform.application.services import DataPlatformService

                DataPlatformService().mark_pipeline_failed(job_id=job.id, error=str(exc))
            except Exception:  # noqa: BLE001
                app_logger.exception("pipeline_mark_failed")
        if job.job_type == "quality.validate":
            try:
                from apps.quality.application.services import QualityService

                QualityService().mark_run_failed(job_id=job.id, error=str(exc))
            except Exception:  # noqa: BLE001
                app_logger.exception("quality_mark_failed")
        app_logger.exception("job_failed", extra={"job_id": job_id})
        return {"ok": False, "error": str(exc)}


@shared_task(
    name="workers.publish_outbox_events",
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    max_retries=5,
)
def publish_outbox_events(self, limit: int = 100) -> dict:
    from apps.events.infrastructure.models import OutboxEvent

    pending = list(
        OutboxEvent.objects.filter(status=OutboxEvent.Status.PENDING).order_by("created_at")[:limit]
    )
    published = 0
    for event in pending:
        try:
            with transaction.atomic():
                app_logger.info(
                    "event_published",
                    extra={
                        "event_type": event.event_type,
                        "event_id": str(event.id),
                        "organization_id": str(event.organization_id or ""),
                    },
                )
                event.mark_published()
                published += 1
        except Exception as exc:  # noqa: BLE001
            event.attempts += 1
            event.last_error = str(exc)
            event.status = OutboxEvent.Status.FAILED
            event.save(update_fields=["attempts", "last_error", "status"])
    metrics.incr("outbox_published_total", value=published)
    return {"published": published}


@shared_task(name="workers.platform_ping")
def platform_ping(message: str = "pong") -> dict:
    payload = {
        "ok": True,
        "ping_message": message,
        "processed_at": timezone.now().isoformat(),
    }
    metrics.incr("platform_ping_total")
    app_logger.info("platform_ping", extra=payload)
    return {"ok": True, "message": message, "processed_at": payload["processed_at"]}


@shared_task(name="workers.run_scheduled_reports")
def run_scheduled_reports() -> dict:
    from apps.enterprise_applications.application.services import ReportingService

    result = ReportingService().run_scheduled_reports()
    app_logger.info("scheduled_reports", extra=result)
    return result


@shared_task(name="workers.run_scheduled_executive_briefs")
def run_scheduled_executive_briefs() -> dict:
    from apps.enterprise_applications.application.services import InsightService

    result = InsightService().run_scheduled_briefs()
    app_logger.info("scheduled_executive_briefs", extra=result)
    return result


@shared_task(name="workers.worker_heartbeat")
def worker_heartbeat() -> dict:
    stamp = timezone.now().isoformat()
    cache.set(WORKER_HEARTBEAT_KEY, stamp, timeout=120)
    metrics.gauge("worker_heartbeat_unixtime", timezone.now().timestamp())
    return {"heartbeat": stamp}
