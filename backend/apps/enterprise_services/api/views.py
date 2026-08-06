"""Enterprise Services API — Track 12.10."""
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.enterprise_services.application.services import EnterpriseServicesService
from apps.enterprise_services.infrastructure.models import (
    FeatureFlag,
    LicenseEntitlement,
    NotificationChannel,
    OrgConfiguration,
    SearchIndexEntry,
    WebhookEndpoint,
)
from apps.jobs.api.views import JobSerializer


class OrgConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrgConfiguration
        fields = (
            "id", "fiscal_year_start_month", "currency", "timezone",
            "industry_profile", "business_calendar", "settings", "created_at",
        )
        read_only_fields = ("id", "created_at")


class FeatureFlagSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeatureFlag
        fields = (
            "id", "key", "description", "enabled", "rollout_pct", "metadata", "created_at",
        )
        read_only_fields = ("id", "created_at")


class SearchIndexSerializer(serializers.ModelSerializer):
    class Meta:
        model = SearchIndexEntry
        fields = (
            "id", "resource_type", "resource_id", "workspace_id",
            "title", "body", "tags", "created_at",
        )
        read_only_fields = fields


class LicenseEntitlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = LicenseEntitlement
        fields = (
            "id", "entitlement_type", "key", "limit_value", "used_value",
            "is_active", "metadata", "created_at",
        )
        read_only_fields = fields


class WebhookSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = ("id", "url", "events", "is_active", "created_at")
        read_only_fields = ("id", "created_at")


class NotificationChannelSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationChannel
        fields = ("id", "channel", "config", "is_active", "created_at")
        read_only_fields = fields


class ConfigurationViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        config = EnterpriseServicesService().get_configuration(
            organization_id=org_id, user=request.user
        )
        return Response(OrgConfigurationSerializer(config).data)

    def create(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        config = EnterpriseServicesService().update_configuration(
            organization_id=org_id,
            user=request.user,
            **{
                k: request.data.get(k)
                for k in (
                    "fiscal_year_start_month",
                    "currency",
                    "timezone",
                    "industry_profile",
                    "business_calendar",
                    "settings",
                )
                if k in request.data
            },
        )
        return Response(OrgConfigurationSerializer(config).data, status=status.HTTP_200_OK)


class FeatureFlagViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        flags = EnterpriseServicesService().list_feature_flags(
            organization_id=org_id, user=request.user
        )
        return paginate_and_serialize(request, flags, FeatureFlagSerializer)

    def create(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        flag = EnterpriseServicesService().upsert_feature_flag(
            organization_id=org_id,
            user=request.user,
            key=request.data.get("key", ""),
            enabled=request.data.get("enabled", False),
            rollout_pct=request.data.get("rollout_pct", 100),
            description=request.data.get("description", ""),
        )
        return Response(FeatureFlagSerializer(flag).data, status=status.HTTP_201_CREATED)


class SearchViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        query = request.query_params.get("q", "")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        results = EnterpriseServicesService().search(
            organization_id=org_id,
            user=request.user,
            query=query,
            resource_type=request.query_params.get("resource_type"),
        )
        return paginate_and_serialize(request, results, SearchIndexSerializer)

    @action(detail=False, methods=["post"], url_path="reindex")
    def reindex(self, request):
        from apps.jobs.application.services import JobService

        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        job = JobService().enqueue(
            organization_id=org_id,
            user=request.user,
            job_type="enterprise_services.search_reindex",
            payload={},
        )
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)


class UsageViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        summary = EnterpriseServicesService().usage_summary(
            organization_id=org_id, user=request.user
        )
        return Response(summary)


class LicensingViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        entitlements = EnterpriseServicesService().list_entitlements(
            organization_id=org_id, user=request.user
        )
        return paginate_and_serialize(request, entitlements, LicenseEntitlementSerializer)

    @action(detail=False, methods=["post"], url_path="seed")
    def seed(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        created = EnterpriseServicesService().seed_entitlements(
            organization_id=org_id, user=request.user
        )
        return Response({"seeded": len(created)}, status=status.HTTP_201_CREATED)


class WebhookViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        hooks = EnterpriseServicesService().list_webhooks(
            organization_id=org_id, user=request.user
        )
        return paginate_and_serialize(request, hooks, WebhookSerializer)

    def create(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        hook = EnterpriseServicesService().create_webhook(
            organization_id=org_id,
            user=request.user,
            url=request.data.get("url", ""),
            events=request.data.get("events", []),
        )
        return Response(WebhookSerializer(hook).data, status=status.HTTP_201_CREATED)


class NotificationChannelViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        channels = EnterpriseServicesService().list_notification_channels(
            organization_id=org_id, user=request.user
        )
        return paginate_and_serialize(request, channels, NotificationChannelSerializer)

    @action(detail=False, methods=["post"], url_path="seed")
    def seed(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        created = EnterpriseServicesService().seed_notification_channels(
            organization_id=org_id, user=request.user
        )
        return Response({"seeded": len(created)}, status=status.HTTP_201_CREATED)
