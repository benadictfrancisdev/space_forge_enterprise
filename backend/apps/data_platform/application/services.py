"""Enterprise Data Platform services — Track 12.1."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, ValidationError
from apps.data_platform.application.pipeline_stages import (
    bronze_normalize,
    parse_content,
    profile_rows,
    rows_to_csv_bytes,
    silver_clean,
)
from apps.data_platform.infrastructure.models import (
    CatalogEntry,
    DatasetVersion,
    LayerArtifact,
    LineageRecord,
    PipelineLayer,
    PipelineRun,
)
from apps.datasets.application.services import DatasetService
from apps.datasets.infrastructure.models import Dataset
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService
from apps.storage.application.services import StorageService
from apps.storage.infrastructure.models import StorageObject

PIPELINE_JOB = "data_platform.pipeline"
LAYER_ORDER = [
    PipelineLayer.LANDING,
    PipelineLayer.BRONZE,
    PipelineLayer.SILVER,
    PipelineLayer.GOLD,
]


class DataPlatformService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.storage = StorageService()
        self.datasets = DatasetService()

    def _require_dataset(self, *, dataset_id, user, permission: str) -> Dataset:
        return self.datasets._get(dataset_id=dataset_id, user=user, permission=permission)

    def list_catalog(self, *, organization_id, user, workspace_id=None, published_only=False):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:read")
        qs = CatalogEntry.objects.filter(organization_id=org.id).select_related("dataset", "owner")
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        if published_only:
            qs = qs.filter(is_published=True)
        return qs.order_by("-updated_at")

    def get_catalog_entry(self, *, dataset_id, user) -> CatalogEntry:
        dataset = self._require_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        try:
            return CatalogEntry.objects.select_related("dataset", "owner").get(dataset_id=dataset.id)
        except CatalogEntry.DoesNotExist as exc:
            raise NotFoundError("Catalog entry not found") from exc

    def list_versions(self, *, dataset_id, user):
        dataset = self._require_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return DatasetVersion.objects.filter(dataset_id=dataset.id).order_by("-version_number")

    def list_layer_artifacts(self, *, dataset_id, user, layer: str | None = None):
        dataset = self._require_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        qs = LayerArtifact.objects.filter(dataset_id=dataset.id).select_related("storage_object")
        if layer:
            qs = qs.filter(layer=layer)
        return qs.order_by("-created_at")

    def list_lineage(self, *, dataset_id, user):
        dataset = self._require_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        as_target = LineageRecord.objects.filter(
            target_type="dataset", target_id=dataset.id
        ).order_by("-created_at")
        as_source = LineageRecord.objects.filter(
            source_type="dataset", source_id=dataset.id
        ).order_by("-created_at")
        return list(as_target) + list(as_source)

    def list_pipeline_runs(self, *, dataset_id, user):
        dataset = self._require_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return PipelineRun.objects.filter(dataset_id=dataset.id).select_related("job").order_by(
            "-created_at"
        )

    @transaction.atomic
    def enqueue_pipeline(
        self,
        *,
        dataset_id,
        user,
        source_storage_object_id=None,
    ) -> tuple[PipelineRun, object]:
        from apps.jobs.application.services import JobService

        dataset = self._require_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        storage_id = source_storage_object_id or dataset.storage_object_id
        if not storage_id:
            raise ValidationError("Dataset has no storage object — upload or sync data first")

        run = PipelineRun.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            status=PipelineRun.Status.QUEUED,
            source_storage_object_id=storage_id,
            created_by=user,
            updated_by=user,
        )
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=PIPELINE_JOB,
            payload={
                "dataset_id": str(dataset.id),
                "pipeline_run_id": str(run.id),
                "source_storage_object_id": str(storage_id),
            },
            timeout_seconds=600,
            max_retries=1,
        )
        run.job = job
        run.save(update_fields=["job", "updated_at"])
        run.refresh_from_db()
        job.refresh_from_db()

        self.audit.record(
            actor=user,
            action="data_platform.pipeline_enqueued",
            resource_type="dataset",
            resource_id=str(dataset.id),
            organization_id=dataset.organization_id,
            after={"pipeline_run_id": str(run.id), "job_id": str(job.id)},
        )
        return run, job

    def ingest_from_storage(
        self,
        *,
        dataset_id,
        storage_object_id,
        user,
        source_type: str = "storage_object",
        source_id=None,
        enqueue_pipeline: bool = True,
    ) -> PipelineRun | None:
        """Entry point after upload/sync — bind storage and optionally run pipeline."""
        dataset = self.datasets.bind_storage(
            dataset_id=dataset_id,
            user=user,
            storage_object_id=storage_object_id,
        )
        if enqueue_pipeline:
            run, _ = self.enqueue_pipeline(
                dataset_id=dataset.id,
                user=user,
                source_storage_object_id=storage_object_id,
            )
            return run
        return None

    def run_pipeline_for_job(self, *, job, job_service) -> dict:
        """Worker entrypoint for data_platform.pipeline."""
        payload = job.payload or {}
        dataset_id = payload.get("dataset_id")
        if not dataset_id:
            raise ValueError("dataset_id required")

        run_id = payload.get("pipeline_run_id")
        run = PipelineRun.objects.filter(id=run_id).first() if run_id else None
        dataset = Dataset.objects.select_related("storage_object").get(id=dataset_id)
        actor = job.created_by or dataset.created_by

        if run is None:
            run = PipelineRun.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                job=job,
                status=PipelineRun.Status.RUNNING,
                created_by=actor,
                updated_by=actor,
            )
        else:
            run.job = job
            run.status = PipelineRun.Status.RUNNING
            run.save(update_fields=["job", "status", "updated_at"])

        storage_id = payload.get("source_storage_object_id") or str(dataset.storage_object_id)
        storage_obj = StorageObject.objects.get(id=storage_id)
        content = self.storage.provider.download(key=storage_obj.key)

        stages_done: list[str] = []
        layer_artifacts: dict[str, LayerArtifact] = {}
        rows, columns = parse_content(content, filename=storage_obj.filename)
        profile = profile_rows(rows, columns)

        for idx, layer in enumerate(LAYER_ORDER):
            pct = 10 + idx * 20
            job_service.update_progress(job, progress_pct=pct, message=f"layer:{layer}")
            run.current_layer = layer
            run.save(update_fields=["current_layer", "updated_at"])

            if layer == PipelineLayer.LANDING:
                layer_rows = rows
            elif layer == PipelineLayer.BRONZE:
                layer_rows = bronze_normalize(rows, columns)
            elif layer == PipelineLayer.SILVER:
                layer_rows = silver_clean(rows, columns)
            else:
                layer_rows = silver_clean(rows, columns)

            csv_bytes = rows_to_csv_bytes(layer_rows)
            filename = f"{dataset.id}-{layer}-{timezone.now().strftime('%Y%m%dT%H%M%SZ')}.csv"
            layer_storage = self.storage.upload(
                organization_id=dataset.organization_id,
                user=actor,
                filename=filename,
                content=csv_bytes,
                content_type="text/csv",
                workspace_id=dataset.workspace_id,
                metadata={"dataset_id": str(dataset.id), "layer": layer},
            )

            layer_profile = profile_rows(layer_rows, columns) if layer != PipelineLayer.LANDING else profile

            artifact = LayerArtifact.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                layer=layer,
                storage_object=layer_storage,
                row_count=len(layer_rows),
                schema=layer_profile["schema"],
                status="ready",
                metadata={"stage": layer},
                created_by=actor,
                updated_by=actor,
            )
            layer_artifacts[layer] = artifact
            stages_done.append(layer)

            LineageRecord.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                source_type="storage_object",
                source_id=storage_obj.id,
                target_type="layer_artifact",
                target_id=artifact.id,
                transformation=f"promote_to_{layer}",
                layer=layer,
                metadata={"row_count": len(layer_rows)},
                created_by=actor,
                updated_by=actor,
            )

        gold_artifact = layer_artifacts[PipelineLayer.GOLD]
        version_number = (dataset.version or 0) + 1
        version = DatasetVersion.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            version_number=version_number,
            storage_object=gold_artifact.storage_object,
            schema=gold_artifact.schema,
            row_count=gold_artifact.row_count,
            checksum_sha256=gold_artifact.storage_object.checksum_sha256,
            change_summary=f"Pipeline run {run.id}",
            source_layer=PipelineLayer.GOLD,
            created_by=actor,
            updated_by=actor,
        )
        gold_artifact.dataset_version = version
        gold_artifact.save(update_fields=["dataset_version", "updated_at"])

        dataset.storage_object = gold_artifact.storage_object
        dataset.schema = gold_artifact.schema
        dataset.statistics = profile["statistics"]
        dataset.row_count = gold_artifact.row_count
        dataset.version = version_number
        dataset.profile_status = Dataset.ProfileStatus.READY
        dataset.status = Dataset.Status.READY
        dataset.updated_by = actor
        dataset.save(
            update_fields=[
                "storage_object",
                "schema",
                "statistics",
                "row_count",
                "version",
                "profile_status",
                "status",
                "updated_by",
                "updated_at",
            ]
        )

        catalog, _ = CatalogEntry.objects.get_or_create(
            dataset=dataset,
            defaults={
                "organization_id": dataset.organization_id,
                "workspace_id": dataset.workspace_id,
                "display_name": dataset.name,
                "description": dataset.description,
                "current_layer": PipelineLayer.GOLD,
                "owner": actor,
                "search_text": f"{dataset.name} {dataset.description}",
                "created_by": actor,
                "updated_by": actor,
            },
        )
        catalog.current_layer = PipelineLayer.GOLD
        catalog.display_name = dataset.name
        catalog.description = dataset.description
        catalog.search_text = f"{dataset.name} {dataset.description}"
        catalog.updated_by = actor
        catalog.save(
            update_fields=[
                "current_layer",
                "display_name",
                "description",
                "search_text",
                "updated_by",
                "updated_at",
            ]
        )

        LineageRecord.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            source_type="dataset",
            source_id=dataset.id,
            target_type="dataset_version",
            target_id=version.id,
            transformation="version_snapshot",
            layer=PipelineLayer.GOLD,
            created_by=actor,
            updated_by=actor,
        )

        run.status = PipelineRun.Status.SUCCEEDED
        run.stages_completed = stages_done
        run.current_layer = PipelineLayer.GOLD
        run.finished_at = timezone.now()
        run.save(
            update_fields=[
                "status",
                "stages_completed",
                "current_layer",
                "finished_at",
                "updated_at",
            ]
        )

        self.audit.record(
            actor=actor,
            action="data_platform.pipeline_completed",
            resource_type="dataset",
            resource_id=str(dataset.id),
            organization_id=dataset.organization_id,
            after={
                "pipeline_run_id": str(run.id),
                "version": version_number,
                "layers": stages_done,
            },
        )

        return {
            "ok": True,
            "dataset_id": str(dataset.id),
            "pipeline_run_id": str(run.id),
            "version_number": version_number,
            "layers_completed": stages_done,
            "row_count": gold_artifact.row_count,
            "catalog_entry_id": str(catalog.id),
        }

    def mark_pipeline_failed(self, *, job_id, error: str) -> None:
        run = PipelineRun.objects.filter(job_id=job_id).first()
        if not run:
            return
        run.status = PipelineRun.Status.FAILED
        run.error = error[:4000]
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "error", "finished_at", "updated_at"])
