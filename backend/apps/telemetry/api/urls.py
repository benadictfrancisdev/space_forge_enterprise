from django.urls import path

from apps.telemetry.api.views import (
    EventIngestView,
    EventQueryView,
    EventStatsView,
    GraphEntitiesView,
    IncidentArtifactsView,
    IncidentGenerateDemoView,
    IncidentListView,
    RuleDeployView,
    RuleListView,
    RuleValidateView,
)

urlpatterns = [
    path("rules/validate/", RuleValidateView.as_view(), name="rules-validate"),
    path("rules/deploy/", RuleDeployView.as_view(), name="rules-deploy"),
    path("rules/", RuleListView.as_view(), name="rules-list"),
    path("graph/entities/", GraphEntitiesView.as_view(), name="graph-entities"),
    path("events/ingest/", EventIngestView.as_view(), name="events-ingest"),
    path("events/query/", EventQueryView.as_view(), name="events-query"),
    path("events/stats/", EventStatsView.as_view(), name="events-stats"),
    path("incidents/", IncidentListView.as_view(), name="incidents-list"),
    path("incidents/generate-demo/", IncidentGenerateDemoView.as_view(), name="incidents-generate-demo"),
    path("incidents/<str:ticket_id>/artifacts/", IncidentArtifactsView.as_view(), name="incidents-artifacts"),
]
