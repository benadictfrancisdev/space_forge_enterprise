from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.jobs.application.services import JobService
from apps.jobs.infrastructure.models import Job


class JobSerializer(serializers.ModelSerializer):
    class Meta:
        model = Job
        fields = (
            "id",
            "organization_id",
            "workspace_id",
            "job_type",
            "status",
            "status_message",
            "progress_pct",
            "priority",
            "attempt_count",
            "max_retries",
            "timeout_seconds",
            "cancel_requested",
            "payload",
            "result",
            "error",
            "celery_task_id",
            "started_at",
            "finished_at",
            "execution_ms",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class JobCreateSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    workspace_id = serializers.UUIDField(required=False, allow_null=True)
    job_type = serializers.CharField(max_length=128)
    payload = serializers.DictField(required=False, default=dict)
    priority = serializers.IntegerField(required=False, default=Job.Priority.NORMAL)
    timeout_seconds = serializers.IntegerField(required=False, default=300, min_value=5, max_value=3600)
    max_retries = serializers.IntegerField(required=False, default=3, min_value=0, max_value=10)


class JobViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        jobs = JobService().list(organization_id=organization_id, user=request.user)
        return paginate_and_serialize(request, jobs, JobSerializer)

    def create(self, request):
        serializer = JobCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        job = JobService().enqueue(
            organization_id=data["organization_id"],
            user=request.user,
            job_type=data["job_type"],
            payload=data.get("payload") or {},
            workspace_id=data.get("workspace_id"),
            priority=data.get("priority", Job.Priority.NORMAL),
            timeout_seconds=data.get("timeout_seconds", 300),
            max_retries=data.get("max_retries", 3),
        )
        return Response(JobSerializer(job).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        job = JobService().get(job_id=pk, user=request.user)
        return Response(JobSerializer(job).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        job = JobService().request_cancel(job_id=pk, user=request.user)
        return Response(JobSerializer(job).data)

    @action(detail=True, methods=["post"], url_path="retry")
    def retry(self, request, pk=None):
        job = JobService().retry(job_id=pk, user=request.user)
        return Response(JobSerializer(job).data, status=status.HTTP_201_CREATED)
