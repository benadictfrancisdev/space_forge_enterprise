from rest_framework.routers import DefaultRouter

from apps.quality.api.views import QualityViewSet

router = DefaultRouter()
router.register(r"datasets", QualityViewSet, basename="quality")

urlpatterns = router.urls
