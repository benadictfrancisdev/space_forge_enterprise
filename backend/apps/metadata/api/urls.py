from rest_framework.routers import DefaultRouter

from apps.metadata.api.views import MetadataViewSet

router = DefaultRouter()
router.register(r"datasets", MetadataViewSet, basename="metadata")

urlpatterns = router.urls
