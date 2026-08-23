"""Dataset intelligence pipeline stages — Track 6."""
from __future__ import annotations

from typing import Any, Callable

from django.utils import timezone

from apps.jobs.application.services import JobService
from apps.jobs.infrastructure.models import Job


class JobCancelled(Exception):
    pass


def _ensure_not_cancelled(job: Job, service: JobService) -> None:
    if service.is_cancelled(job):
        service.mark_cancelled(job)
        raise JobCancelled("Job cancelled")


def run_dataset_pipeline(job: Job, service: JobService) -> dict[str, Any]:
    """
    Profile → Forecast → Narrative → Decisions → Report summary.
    Updates progress between stages. Does not block the HTTP request path.
    """
    payload = job.payload or {}
    dataset_id = payload.get("dataset_id")
    if not dataset_id:
        raise ValueError("dataset_id required for dataset.pipeline")

    stages: list[tuple[str, int, Callable[[], Any]]] = []

    def stage_profile():
        from apps.datasets.application.services import DatasetService

        return DatasetService().run_profile_now(
            dataset_id=dataset_id,
            organization_id=job.organization_id,
        )

    def stage_forecast():
        import sys
        from pathlib import Path

        from django.conf import settings

        root = str(Path(settings.BASE_DIR))
        if root not in sys.path:
            sys.path.insert(0, root)
        from ai_service.gateway import run_gateway
        from apps.datasets.infrastructure.models import Dataset

        ds = Dataset.objects.get(id=dataset_id, organization_id=job.organization_id)
        return run_gateway(
            "forecast",
            {
                "dataset_id": str(ds.id),
                "profile": {
                    "schema": ds.schema or {},
                    "statistics": ds.statistics or {},
                    "row_count": ds.row_count,
                },
                "horizon": int(payload.get("horizon") or 7),
            },
        )

    def stage_narrative():
        import sys
        from pathlib import Path

        from django.conf import settings

        root = str(Path(settings.BASE_DIR))
        if root not in sys.path:
            sys.path.insert(0, root)
        from ai_service.gateway import run_gateway
        from apps.datasets.infrastructure.models import Dataset

        ds = Dataset.objects.get(id=dataset_id, organization_id=job.organization_id)
        return run_gateway(
            "narrative",
            {
                "dataset_id": str(ds.id),
                "profile": {
                    "schema": ds.schema or {},
                    "statistics": ds.statistics or {},
                    "row_count": ds.row_count,
                },
            },
        )

    def stage_decisions():
        import sys
        from pathlib import Path

        from django.conf import settings

        root = str(Path(settings.BASE_DIR))
        if root not in sys.path:
            sys.path.insert(0, root)
        from ai_service.gateway import run_gateway
        from apps.datasets.infrastructure.models import Dataset

        ds = Dataset.objects.get(id=dataset_id, organization_id=job.organization_id)
        return run_gateway(
            "decisions",
            {
                "dataset_id": str(ds.id),
                "profile": {
                    "schema": ds.schema or {},
                    "statistics": ds.statistics or {},
                    "row_count": ds.row_count,
                },
            },
        )

    def stage_report(prev: dict[str, Any]):
        from apps.datasets.infrastructure.models import Dataset

        ds = Dataset.objects.get(id=dataset_id, organization_id=job.organization_id)
        return {
            "title": f"Intelligence report · {ds.name}",
            "dataset_id": str(ds.id),
            "row_count": ds.row_count,
            "profile_status": ds.profile_status,
            "generated_at": timezone.now().isoformat(),
            "sections": {
                "forecast": (prev.get("forecast") or {}).get("result"),
                "narrative": (prev.get("narrative") or {}).get("result"),
                "decisions": (prev.get("decisions") or {}).get("result"),
            },
        }

    outputs: dict[str, Any] = {}
    stage_defs = [
        ("profile", 15, stage_profile),
        ("forecast", 40, stage_forecast),
        ("narrative", 65, stage_narrative),
        ("decisions", 85, stage_decisions),
    ]

    for name, pct, fn in stage_defs:
        _ensure_not_cancelled(job, service)
        service.update_progress(job, progress_pct=pct, message=f"running:{name}")
        outputs[name] = fn()

    _ensure_not_cancelled(job, service)
    service.update_progress(job, progress_pct=95, message="running:report")
    outputs["report"] = stage_report(outputs)

    return {
        "dataset_id": dataset_id,
        "stages": list(outputs.keys()),
        "outputs": {
            "profile": {
                "row_count": getattr(outputs["profile"], "row_count", None),
                "profile_status": getattr(outputs["profile"], "profile_status", None),
            },
            "forecast": outputs.get("forecast"),
            "narrative": outputs.get("narrative"),
            "decisions": outputs.get("decisions"),
            "report": outputs.get("report"),
        },
        "processed_at": timezone.now().isoformat(),
        "job_type": job.job_type,
    }
