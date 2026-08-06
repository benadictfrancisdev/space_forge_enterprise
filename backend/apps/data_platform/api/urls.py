from rest_framework.routers import DefaultRouter

from apps.data_platform.api.views import CatalogViewSet, DatasetPlatformViewSet

router = DefaultRouter()
router.register(r"catalog", CatalogViewSet, basename="catalog")
router.register(r"datasets", DatasetPlatformViewSet, basename="dataset-platform")

urlpatterns = router.urls
