from rest_framework.routers import DefaultRouter

from apps.ai_platform.api.views import (
    AgentViewSet,
    AIPlatformDatasetViewSet,
    ObservabilityViewSet,
    PromptViewSet,
)

router = DefaultRouter()
router.register(r"prompts", PromptViewSet, basename="ai-prompt")
router.register(r"agents", AgentViewSet, basename="ai-agent")
router.register(r"observability", ObservabilityViewSet, basename="ai-observability")
router.register(r"datasets", AIPlatformDatasetViewSet, basename="ai-platform-dataset")

urlpatterns = router.urls
