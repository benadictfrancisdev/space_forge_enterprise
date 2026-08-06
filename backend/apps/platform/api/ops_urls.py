from django.urls import path

from apps.platform.api.ops_views import (
    OpsAISummaryView,
    OpsAlertsView,
    OpsConnectorFailuresView,
    OpsConnectorsSummaryView,
    OpsJobsSummaryView,
    OpsPlatformHealthView,
    OpsSummaryView,
)

urlpatterns = [
    path("summary/", OpsSummaryView.as_view(), name="ops-summary"),
    path("platform-health/", OpsPlatformHealthView.as_view(), name="ops-platform-health"),
    path("jobs/summary/", OpsJobsSummaryView.as_view(), name="ops-jobs-summary"),
    path("ai/summary/", OpsAISummaryView.as_view(), name="ops-ai-summary"),
    path("alerts/", OpsAlertsView.as_view(), name="ops-alerts"),
    path("connectors/summary/", OpsConnectorsSummaryView.as_view(), name="ops-connectors-summary"),
    path("connectors/failures/", OpsConnectorFailuresView.as_view(), name="ops-connectors-failures"),
]
