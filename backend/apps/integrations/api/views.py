from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.integrations.application.connection_service import ConnectionService
from apps.integrations.application.connector_registry import get_connector_registry
from apps.integrations.application.credential_service import CredentialService
from apps.integrations.application.discovery_service import DiscoveryService
from apps.integrations.application.sync_service import SyncService
from apps.integrations.application.transform_service import TransformService
from apps.integrations.domain.auth import AuthMethod
from apps.integrations.domain.sync import SyncMode
from apps.integrations.infrastructure.models import (
    Connection,
    Credential,
    SchemaSnapshot,
    SyncRun,
    TransformRule,
)
from apps.jobs.api.views import JobSerializer


class CredentialSerializer(serializers.ModelSerializer):
    """Public credential metadata — never includes encrypted_payload or secrets."""

    class Meta:
        model = Credential
        fields = (
            "id",
            "organization_id",
            "name",
            "auth_method",
            "status",
            "key_version",
            "rotation_due_at",
            "last_rotated_at",
            "replaces_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class CredentialCreateSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    name = serializers.CharField(max_length=255)
    auth_method = serializers.ChoiceField(
        choices=[(m.value, m.value) for m in AuthMethod],
        default=AuthMethod.PASSWORD.value,
    )
    payload = serializers.DictField(write_only=True)
    rotation_due_at = serializers.DateTimeField(required=False, allow_null=True)


class CredentialRotateSerializer(serializers.Serializer):
    payload = serializers.DictField(write_only=True)


class CredentialViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {
                    "error": {
                        "code": "validation_error",
                        "message": "organization_id is required",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        include_inactive = request.query_params.get("include_inactive") in {
            "1",
            "true",
            "yes",
        }
        credentials = CredentialService().list(
            organization_id=organization_id,
            user=request.user,
            include_inactive=include_inactive,
        )
        return paginate_and_serialize(request, credentials, CredentialSerializer)

    def create(self, request):
        serializer = CredentialCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        credential = CredentialService().create(
            organization_id=serializer.validated_data["organization_id"],
            user=request.user,
            name=serializer.validated_data["name"],
            auth_method=serializer.validated_data["auth_method"],
            payload=serializer.validated_data["payload"],
            rotation_due_at=serializer.validated_data.get("rotation_due_at"),
        )
        return Response(
            CredentialSerializer(credential).data, status=status.HTTP_201_CREATED
        )

    def retrieve(self, request, pk=None):
        credential = CredentialService().get(credential_id=pk, user=request.user)
        return Response(CredentialSerializer(credential).data)

    def destroy(self, request, pk=None):
        CredentialService().delete(credential_id=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="rotate")
    def rotate(self, request, pk=None):
        serializer = CredentialRotateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        credential = CredentialService().rotate(
            credential_id=pk,
            user=request.user,
            payload=serializer.validated_data["payload"],
        )
        return Response(CredentialSerializer(credential).data, status=status.HTTP_201_CREATED)


class ConnectionSerializer(serializers.ModelSerializer):
    credential_id = serializers.UUIDField(source="credential.id", allow_null=True, read_only=True)
    target_dataset_id = serializers.UUIDField(
        source="target_dataset.id", allow_null=True, read_only=True
    )

    class Meta:
        model = Connection
        fields = (
            "id",
            "organization_id",
            "workspace_id",
            "name",
            "connector_type",
            "connector_version",
            "credential_id",
            "config",
            "health_status",
            "last_health_message",
            "last_tested_at",
            "last_sync_at",
            "next_sync_at",
            "schema_version",
            "is_active",
            "sync_schedule",
            "target_dataset_id",
            "owner_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class ConnectionCreateSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    workspace_id = serializers.UUIDField()
    name = serializers.CharField(max_length=255)
    connector_type = serializers.CharField(max_length=128)
    connector_version = serializers.CharField(max_length=32, required=False, allow_blank=True)
    config = serializers.DictField(required=False, default=dict)
    credential_id = serializers.UUIDField(required=False, allow_null=True)
    secrets = serializers.DictField(required=False, write_only=True)
    auth_method = serializers.ChoiceField(
        choices=[(m.value, m.value) for m in AuthMethod],
        required=False,
        default=AuthMethod.PASSWORD.value,
    )
    sync_schedule = serializers.CharField(max_length=64, required=False, default="manual")
    is_active = serializers.BooleanField(required=False, default=True)


class ConnectionUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    config = serializers.DictField(required=False)
    sync_schedule = serializers.CharField(max_length=64, required=False)
    is_active = serializers.BooleanField(required=False)
    secrets = serializers.DictField(required=False, write_only=True)


class ConnectionSyncSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(
        choices=[(SyncMode.FULL.value, SyncMode.FULL.value), (SyncMode.INCREMENTAL.value, SyncMode.INCREMENTAL.value)],
        required=False,
        default=SyncMode.FULL.value,
    )
    batch_size = serializers.IntegerField(required=False, min_value=1, max_value=5000, default=100)


class ConnectorDraftTestSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    connector_type = serializers.CharField(max_length=128)
    connector_version = serializers.CharField(max_length=32, required=False, allow_blank=True)
    config = serializers.DictField(required=False, default=dict)
    credentials = serializers.DictField(required=False, write_only=True, default=dict)


class ConnectionViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {
                    "error": {
                        "code": "validation_error",
                        "message": "organization_id is required",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        connections = ConnectionService().list(
            organization_id=organization_id,
            user=request.user,
            workspace_id=request.query_params.get("workspace_id"),
        )
        return paginate_and_serialize(request, connections, ConnectionSerializer)

    def create(self, request):
        serializer = ConnectionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        connection = ConnectionService().create(
            organization_id=data["organization_id"],
            workspace_id=data["workspace_id"],
            user=request.user,
            name=data["name"],
            connector_type=data["connector_type"],
            connector_version=data.get("connector_version") or None,
            config=data.get("config") or {},
            credential_id=data.get("credential_id"),
            secrets=data.get("secrets"),
            auth_method=data.get("auth_method"),
            sync_schedule=data.get("sync_schedule") or "manual",
            is_active=data.get("is_active", True),
        )
        return Response(ConnectionSerializer(connection).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        connection = ConnectionService().get(connection_id=pk, user=request.user)
        return Response(ConnectionSerializer(connection).data)

    def partial_update(self, request, pk=None):
        serializer = ConnectionUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        connection = ConnectionService().update(
            connection_id=pk,
            user=request.user,
            name=data.get("name"),
            config=data.get("config"),
            sync_schedule=data.get("sync_schedule"),
            is_active=data.get("is_active"),
            secrets=data.get("secrets"),
        )
        return Response(ConnectionSerializer(connection).data)

    def destroy(self, request, pk=None):
        ConnectionService().delete(connection_id=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="test")
    def test(self, request, pk=None):
        job = ConnectionService().enqueue_test(connection_id=pk, user=request.user)
        connection = ConnectionService().get(connection_id=pk, user=request.user)
        return Response(
            {
                "job": JobSerializer(job).data,
                "connection": ConnectionSerializer(connection).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"], url_path="discover")
    def discover(self, request, pk=None):
        from apps.core.exceptions import NotFoundError

        job = DiscoveryService().enqueue_discover(connection_id=pk, user=request.user)
        # Eager Celery completes before response; re-fetch connection + schema.
        connection = ConnectionService().get(connection_id=pk, user=request.user)
        snapshot = None
        try:
            snapshot = DiscoveryService().get_latest(connection_id=pk, user=request.user)
        except NotFoundError:
            snapshot = None
        return Response(
            {
                "job": JobSerializer(job).data,
                "connection": ConnectionSerializer(connection).data,
                "schema": SchemaSnapshotSerializer(snapshot).data if snapshot else None,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"], url_path="schema")
    def schema(self, request, pk=None):
        version_raw = request.query_params.get("version")
        if version_raw:
            try:
                version = int(version_raw)
            except ValueError:
                return Response(
                    {
                        "error": {
                            "code": "validation_error",
                            "message": "version must be an integer",
                        }
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            snapshot = DiscoveryService().get_version(
                connection_id=pk, user=request.user, version=version
            )
            return Response(SchemaSnapshotSerializer(snapshot).data)

        snapshot = DiscoveryService().get_latest(connection_id=pk, user=request.user)
        return Response(SchemaSnapshotSerializer(snapshot).data)

    @action(detail=True, methods=["post"], url_path="sync")
    def sync(self, request, pk=None):
        serializer = ConnectionSyncSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        job, run = SyncService().enqueue_sync(
            connection_id=pk,
            user=request.user,
            mode=serializer.validated_data.get("mode") or SyncMode.FULL.value,
            batch_size=serializer.validated_data.get("batch_size") or 100,
        )
        connection = ConnectionService().get(connection_id=pk, user=request.user)
        return Response(
            {
                "job": JobSerializer(job).data,
                "sync_run": SyncRunSerializer(run).data,
                "connection": ConnectionSerializer(connection).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"], url_path="sync-runs")
    def sync_runs(self, request, pk=None):
        runs = SyncService().list_runs(connection_id=pk, user=request.user)
        return paginate_and_serialize(request, runs, SyncRunSerializer)

    @action(detail=True, methods=["get", "post"], url_path="transform-rules")
    def transform_rules(self, request, pk=None):
        if request.method.lower() == "get":
            rules = TransformService().list(connection_id=pk, user=request.user)
            return paginate_and_serialize(request, rules, TransformRuleSerializer)
        serializer = TransformRuleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        rule = TransformService().create(
            connection_id=pk,
            user=request.user,
            name=data["name"],
            steps=data.get("steps") or [],
            table_name=data.get("table_name") or "",
            is_active=data.get("is_active", True),
            priority=data.get("priority", 100),
        )
        return Response(TransformRuleSerializer(rule).data, status=status.HTTP_201_CREATED)


class SchemaSnapshotSerializer(serializers.ModelSerializer):
    connection_id = serializers.UUIDField(source="connection.id", read_only=True)

    class Meta:
        model = SchemaSnapshot
        fields = (
            "id",
            "organization_id",
            "workspace_id",
            "connection_id",
            "version",
            "discovered_at",
            "tables",
            "fingerprint",
            "metadata",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class SyncRunSerializer(serializers.ModelSerializer):
    connection_id = serializers.UUIDField(source="connection.id", read_only=True)
    job_id = serializers.UUIDField(source="job.id", allow_null=True, read_only=True)
    dataset_id = serializers.UUIDField(source="dataset.id", allow_null=True, read_only=True)
    storage_object_id = serializers.UUIDField(
        source="storage_object.id", allow_null=True, read_only=True
    )

    class Meta:
        model = SyncRun
        fields = (
            "id",
            "organization_id",
            "workspace_id",
            "connection_id",
            "job_id",
            "mode",
            "status",
            "rows_extracted",
            "rows_loaded",
            "cursor_state",
            "error",
            "started_at",
            "finished_at",
            "storage_object_id",
            "dataset_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class TransformRuleSerializer(serializers.ModelSerializer):
    connection_id = serializers.UUIDField(source="connection.id", read_only=True)

    class Meta:
        model = TransformRule
        fields = (
            "id",
            "organization_id",
            "workspace_id",
            "connection_id",
            "name",
            "table_name",
            "steps",
            "is_active",
            "priority",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class TransformRuleCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    steps = serializers.ListField(child=serializers.DictField(), required=False, default=list)
    table_name = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    is_active = serializers.BooleanField(required=False, default=True)
    priority = serializers.IntegerField(required=False, min_value=0, max_value=10000, default=100)


class TransformRuleUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255, required=False)
    steps = serializers.ListField(child=serializers.DictField(), required=False)
    table_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    priority = serializers.IntegerField(required=False, min_value=0, max_value=10000)


class TransformRuleViewSet(viewsets.ViewSet):
    def retrieve(self, request, pk=None):
        rule = TransformService().get(rule_id=pk, user=request.user)
        return Response(TransformRuleSerializer(rule).data)

    def partial_update(self, request, pk=None):
        serializer = TransformRuleUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        rule = TransformService().update(
            rule_id=pk,
            user=request.user,
            name=data.get("name"),
            steps=data.get("steps"),
            table_name=data.get("table_name"),
            is_active=data.get("is_active"),
            priority=data.get("priority"),
        )
        return Response(TransformRuleSerializer(rule).data)

    def destroy(self, request, pk=None):
        TransformService().delete(rule_id=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConnectorCatalogViewSet(viewsets.ViewSet):
    """Installed connector plugins (UI form builder + draft test)."""

    def list(self, request):
        return Response(get_connector_registry().list_types())

    @action(detail=False, methods=["post"], url_path="test")
    def test(self, request):
        serializer = ConnectorDraftTestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        result = ConnectionService().test_draft(
            organization_id=data["organization_id"],
            user=request.user,
            connector_type=data["connector_type"],
            connector_version=data.get("connector_version") or None,
            config=data.get("config") or {},
            credentials=data.get("credentials") or {},
        )
        return Response(
            {
                "ok": result.ok,
                "message": result.message,
                "details": result.details or {},
                "rowCount": (result.details or {}).get("rowCount"),
            }
        )
