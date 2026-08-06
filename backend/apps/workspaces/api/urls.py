from rest_framework.routers import DefaultRouter

from apps.workspaces.api.views import WorkspaceViewSet

router = DefaultRouter()
router.register(r"workspaces", WorkspaceViewSet, basename="workspace")

urlpatterns = router.urls
