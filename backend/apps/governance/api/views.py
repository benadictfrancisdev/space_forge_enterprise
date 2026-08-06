"""Governance API — Track 12.9."""
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.governance.application.services import GovernanceService
from apps.governance.infrastructure.models import (
    ComplianceControl,
    ConsentRecord,
    DatasetGovernance,
    Department,
    GovernancePolicy,
    PolicyViolation,
    SecurityPolicy,
    Team,
)
from apps.jobs.api.views import JobSerializer


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ("id", "name", "slug", "description", "created_at")
        read_only_fields = fields


class TeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ("id", "department_id", "name", "slug", "description", "created_at")
        read_only_fields = fields


class GovernancePolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = GovernancePolicy
        fields = (
            "id", "name", "policy_type", "scope", "workspace_id",
            "department_id", "team_id", "rules", "is_active", "priority", "created_at",
        )
        read_only_fields = ("id", "created_at")


class DatasetGovernanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetGovernance
        fields = (
            "id", "dataset_id", "classification", "owner_id", "ai_allowed",
            "export_allowed", "consent_required", "retention_days", "created_at",
        )
        read_only_fields = fields


class ComplianceControlSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComplianceControl
        fields = ("id", "framework", "control_id", "title", "status", "evidence", "created_at")
        read_only_fields = fields


class SecurityPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = SecurityPolicy
        fields = ("id", "kind", "name", "config", "is_active", "created_at")
        read_only_fields = fields


class PolicyViolationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PolicyViolation
        fields = (
            "id", "policy_id", "resource_type", "resource_id",
            "violation_type", "severity", "resolved", "created_at",
        )
        read_only_fields = fields


class DepartmentViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        depts = GovernanceService().list_departments(organization_id=org_id, user=request.user)
        return paginate_and_serialize(request, depts, DepartmentSerializer)

    def create(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dept = GovernanceService().create_department(
            organization_id=org_id,
            user=request.user,
            name=request.data.get("name", ""),
            slug=request.data.get("slug", ""),
            description=request.data.get("description", ""),
        )
        return Response(DepartmentSerializer(dept).data, status=status.HTTP_201_CREATED)


class TeamViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        teams = GovernanceService().list_teams(
            organization_id=org_id,
            user=request.user,
            department_id=request.query_params.get("department_id"),
        )
        return paginate_and_serialize(request, teams, TeamSerializer)

    def create(self, request):
        org_id = request.data.get("organization_id")
        dept_id = request.data.get("department_id")
        if not org_id or not dept_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id and department_id required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        team = GovernanceService().create_team(
            organization_id=org_id,
            user=request.user,
            department_id=dept_id,
            name=request.data.get("name", ""),
            slug=request.data.get("slug", ""),
            description=request.data.get("description", ""),
        )
        return Response(TeamSerializer(team).data, status=status.HTTP_201_CREATED)


class PolicyViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        policies = GovernanceService().list_policies(
            organization_id=org_id,
            user=request.user,
            scope=request.query_params.get("scope"),
        )
        return paginate_and_serialize(request, policies, GovernancePolicySerializer)

    def create(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        policy = GovernanceService().create_policy(
            organization_id=org_id,
            user=request.user,
            name=request.data.get("name", ""),
            policy_type=request.data.get("policy_type", "access"),
            scope=request.data.get("scope", "organization"),
            workspace_id=request.data.get("workspace_id"),
            rules=request.data.get("rules", {}),
            is_active=request.data.get("is_active", True),
            priority=request.data.get("priority", 100),
        )
        return Response(GovernancePolicySerializer(policy).data, status=status.HTTP_201_CREATED)


class ComplianceViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        controls = GovernanceService().list_compliance_controls(
            organization_id=org_id,
            user=request.user,
            framework=request.query_params.get("framework"),
        )
        return paginate_and_serialize(request, controls, ComplianceControlSerializer)

    @action(detail=False, methods=["post"], url_path="seed")
    def seed(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        created = GovernanceService().seed_compliance_controls(
            organization_id=org_id, user=request.user
        )
        return Response(
            {"seeded": len(created)},
            status=status.HTTP_201_CREATED,
        )


class SecurityPolicyViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        policies = GovernanceService().list_security_policies(
            organization_id=org_id, user=request.user
        )
        return paginate_and_serialize(request, policies, SecurityPolicySerializer)

    @action(detail=False, methods=["post"], url_path="seed")
    def seed(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        created = GovernanceService().seed_security_policies(
            organization_id=org_id, user=request.user
        )
        return Response({"seeded": len(created)}, status=status.HTTP_201_CREATED)


class GovernanceDashboardViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dashboard = GovernanceService().get_dashboard(
            organization_id=org_id, user=request.user
        )
        return Response(dashboard)


class GovernanceDatasetViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["get"], url_path="governance")
    def governance(self, request, pk=None):
        gov = GovernanceService().get_dataset_governance(
            dataset_id=pk, user=request.user
        )
        return Response(DatasetGovernanceSerializer(gov).data)

    @action(detail=True, methods=["post"], url_path="classify")
    def classify(self, request, pk=None):
        from apps.jobs.application.services import JobService

        dataset = GovernanceService()._get_dataset(
            dataset_id=pk, user=request.user, permission="governance:write"
        )
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=request.user,
            workspace_id=dataset.workspace_id,
            job_type="governance.classify",
            payload={
                "dataset_id": str(dataset.id),
                "classification": request.data.get("classification", "internal"),
                "ai_allowed": request.data.get("ai_allowed", True),
                "export_allowed": request.data.get("export_allowed", True),
                "retention_days": request.data.get("retention_days"),
            },
        )
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["get"], url_path="lineage")
    def lineage(self, request, pk=None):
        lineage = GovernanceService().build_dataset_lineage(
            dataset_id=pk, user=request.user
        )
        return Response(lineage)

    @action(detail=True, methods=["post"], url_path="sync-lineage")
    def sync_lineage(self, request, pk=None):
        from apps.jobs.application.services import JobService

        dataset = GovernanceService()._get_dataset(
            dataset_id=pk, user=request.user, permission="governance:write"
        )
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=request.user,
            workspace_id=dataset.workspace_id,
            job_type="governance.lineage",
            payload={"dataset_id": str(dataset.id)},
        )
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["post"], url_path="evaluate")
    def evaluate(self, request, pk=None):
        dataset = GovernanceService()._get_dataset(
            dataset_id=pk, user=request.user, permission="governance:read"
        )
        result = GovernanceService().evaluate_policy(
            organization_id=dataset.organization_id,
            user=request.user,
            action=request.data.get("action", "dataset:read"),
            resource_type="dataset",
            resource_id=dataset.id,
            workspace_id=dataset.workspace_id,
            classification=request.data.get("classification", "internal"),
        )
        return Response(result)

    @action(detail=True, methods=["post"], url_path="consent")
    def consent(self, request, pk=None):
        record = GovernanceService().record_consent(
            dataset_id=pk,
            user=request.user,
            subject_identifier=request.data.get("subject_identifier", ""),
            consent_given=request.data.get("consent_given", False),
            purpose=request.data.get("purpose", ""),
        )
        return Response(
            {"id": str(record.id), "consent_given": record.consent_given},
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="delete-request")
    def delete_request(self, request, pk=None):
        job = GovernanceService().request_delete(
            dataset_id=pk,
            user=request.user,
            subject_identifier=request.data.get("subject_identifier", ""),
        )
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)
