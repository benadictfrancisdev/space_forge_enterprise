from rest_framework.routers import DefaultRouter

from apps.jobs.api.views import JobViewSet

router = DefaultRouter()
router.register(r"jobs", JobViewSet, basename="job")

urlpatterns = router.urls
