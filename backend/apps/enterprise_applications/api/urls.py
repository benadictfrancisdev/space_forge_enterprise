from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.enterprise_applications.api.views import (
    DecisionViewSet,
    ExecutiveInsightViewSet,
    ForecastStudioViewSet,
    JourneyViewSet,
    OperationalViewSet,
    ReportingViewSet,
    SankeyViewSet,
    ScientistViewSet,
)

router = DefaultRouter(trailing_slash=True)
router.register("executive", ExecutiveInsightViewSet, basename="app-executive")
router.register("journeys", JourneyViewSet, basename="app-journeys")
router.register("decisions", DecisionViewSet, basename="app-decisions")
router.register("forecast", ForecastStudioViewSet, basename="app-forecast")
router.register("reporting", ReportingViewSet, basename="app-reporting")
router.register("sankey", SankeyViewSet, basename="app-sankey")
router.register("operations", OperationalViewSet, basename="app-operations")
router.register("scientist", ScientistViewSet, basename="app-scientist")

urlpatterns = [
    path("", include(router.urls)),
]
