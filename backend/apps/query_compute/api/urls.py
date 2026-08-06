from rest_framework.routers import DefaultRouter

from apps.query_compute.api.views import QueryComputeViewSet, WorkerPoolViewSet

router = DefaultRouter()
router.register(r"datasets", QueryComputeViewSet, basename="query-compute")
router.register(r"worker-pools", WorkerPoolViewSet, basename="worker-pool")

urlpatterns = router.urls
