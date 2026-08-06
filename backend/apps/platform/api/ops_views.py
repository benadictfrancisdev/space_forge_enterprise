from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.api.envelope import success_envelope
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService
from apps.integrations.application.ops_service import connector_failures, connectors_summary
from apps.platform.application.ops import (
    ai_ops_summary,
    evaluate_alerts,
    jobs_summary,
    ops_summary,
    platform_health_detail,
)


def _require_org(request, permission: str):
    organization_id = request.query_params.get("organization_id")
    if not organization_id:
        return None, Response(
            {"error": {"code": "validation_error", "message": "organization_id is required"}},
            status=status.HTTP_400_BAD_REQUEST,
        )
    OrganizationService().get_for_user(organization_id=organization_id, user=request.user)
    PermissionService().require(
        user=request.user,
        organization_id=organization_id,
        permission=permission,
    )
    return organization_id, None


class OpsSummaryView(APIView):
    """GET /api/v1/ops/summary/ — platform operations overview."""

    def get(self, request):
        org_id, err = _require_org(request, "ops:read")
        if err:
            return err
        return Response(success_envelope(ops_summary(organization_id=org_id)))


class OpsPlatformHealthView(APIView):
    """GET /api/v1/ops/platform-health/ — dependency health (Track 10.3)."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response(success_envelope(platform_health_detail()))


class OpsJobsSummaryView(APIView):
    """GET /api/v1/ops/jobs/summary/ — background job monitoring."""

    def get(self, request):
        org_id, err = _require_org(request, "job:read")
        if err:
            return err
        return Response(success_envelope(jobs_summary(organization_id=org_id)))


class OpsAISummaryView(APIView):
    """GET /api/v1/ops/ai/summary/ — AI operations rollup."""

    def get(self, request):
        org_id, err = _require_org(request, "audit:read")
        if err:
            return err
        hours = int(request.query_params.get("hours", 24))
        return Response(success_envelope(ai_ops_summary(organization_id=org_id, hours=hours)))


class OpsAlertsView(APIView):
    """GET /api/v1/ops/alerts/ — computed operational alerts."""

    def get(self, request):
        org_id, err = _require_org(request, "ops:read")
        if err:
            return err
        return Response(success_envelope({"alerts": evaluate_alerts(organization_id=org_id)}))


class OpsConnectorsSummaryView(APIView):
    """GET /api/v1/ops/connectors/summary/ — connector health and sync rollup."""

    def get(self, request):
        org_id, err = _require_org(request, "connection:read")
        if err:
            return err
        workspace_id = request.query_params.get("workspace_id")
        hours = int(request.query_params.get("hours", 168))
        return Response(
            success_envelope(
                connectors_summary(
                    organization_id=org_id,
                    workspace_id=workspace_id,
                    hours=hours,
                )
            )
        )


class OpsConnectorFailuresView(APIView):
    """GET /api/v1/ops/connectors/failures/ — recent sync failure diagnostics."""

    def get(self, request):
        org_id, err = _require_org(request, "connection:read")
        if err:
            return err
        workspace_id = request.query_params.get("workspace_id")
        hours = int(request.query_params.get("hours", 168))
        limit = int(request.query_params.get("limit", 20))
        return Response(
            success_envelope(
                {
                    "failures": connector_failures(
                        organization_id=org_id,
                        workspace_id=workspace_id,
                        hours=hours,
                        limit=limit,
                    )
                }
            )
        )
