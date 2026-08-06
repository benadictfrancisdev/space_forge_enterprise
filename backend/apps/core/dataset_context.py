"""Shared dataset load context for Wave 2 platform services."""
from __future__ import annotations

from apps.core.exceptions import NotFoundError, ValidationError
from apps.data_platform.application.pipeline_stages import parse_content, profile_rows
from apps.datasets.infrastructure.models import Dataset
from apps.quality.infrastructure.models import QualityReport


def load_dataset_context(dataset_id: str) -> dict:
    try:
        dataset = Dataset.objects.select_related("storage_object").get(id=dataset_id)
    except Dataset.DoesNotExist as exc:
        raise NotFoundError("Dataset not found") from exc

    schema = dataset.schema or {}
    statistics = dataset.statistics or {}
    rows: list[dict] = []
    columns: list[str] = [c.get("name") for c in (schema.get("columns") or []) if c.get("name")]

    if dataset.storage_object_id:
        from apps.storage.application.factory import get_object_storage

        provider = get_object_storage()
        content = provider.download(key=dataset.storage_object.key)
        rows, parsed_cols = parse_content(content, filename=dataset.storage_object.filename)
        if parsed_cols:
            columns = parsed_cols
        if rows and not statistics.get("columns"):
            profile = profile_rows(rows, columns)
            statistics = profile["statistics"]
            schema = profile["schema"]

    quality_report = (
        QualityReport.objects.filter(dataset_id=dataset.id).order_by("-created_at").first()
    )
    quality_run = quality_report.quality_run if quality_report else None

    return {
        "dataset": dataset,
        "schema": schema,
        "statistics": statistics,
        "rows": rows,
        "columns": columns,
        "row_count": dataset.row_count or len(rows),
        "quality_report": quality_report,
        "quality_run": quality_run,
    }


def require_quality_gate(context: dict, min_score: float = 50.0) -> None:
    report = context.get("quality_report")
    if not report:
        raise ValidationError("Dataset has no quality report — run quality validation first")
    if report.overall_score < min_score:
        raise ValidationError(
            f"Quality score {report.overall_score} below minimum {min_score} "
            "for intelligence operations"
        )
