from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.governance.api.views import (
    ComplianceViewSet,
    DepartmentViewSet,
    GovernanceDashboardViewSet,
    GovernanceDatasetViewSet,
    PolicyViewSet,
    SecurityPolicyViewSet,
    TeamViewSet,
)

router = DefaultRouter(trailing_slash=True)
router.register("departments", DepartmentViewSet, basename="governance-departments")
router.register("teams", TeamViewSet, basename="governance-teams")
router.register("policies", PolicyViewSet, basename="governance-policies")
router.register("compliance", ComplianceViewSet, basename="governance-compliance")
router.register("security-policies", SecurityPolicyViewSet, basename="governance-security")
router.register("dashboard", GovernanceDashboardViewSet, basename="governance-dashboard")
router.register("datasets", GovernanceDatasetViewSet, basename="governance-datasets")

urlpatterns = [
    path("", include(router.urls)),
]
