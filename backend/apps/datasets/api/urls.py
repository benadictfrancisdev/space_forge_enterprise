from rest_framework.routers import DefaultRouter

from apps.datasets.api.views import DatasetViewSet

router = DefaultRouter()
router.register(r"datasets", DatasetViewSet, basename="dataset")

urlpatterns = router.urls
