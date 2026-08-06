from rest_framework.routers import DefaultRouter

from apps.analytics.api.views import AnalyticsViewSet

router = DefaultRouter()
router.register(r"datasets", AnalyticsViewSet, basename="analytics")

urlpatterns = router.urls
