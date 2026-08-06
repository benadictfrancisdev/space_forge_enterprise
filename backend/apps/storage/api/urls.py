from rest_framework.routers import DefaultRouter

from apps.storage.api.views import StorageObjectViewSet

router = DefaultRouter()
router.register(r"storage/objects", StorageObjectViewSet, basename="storage-object")

urlpatterns = router.urls
