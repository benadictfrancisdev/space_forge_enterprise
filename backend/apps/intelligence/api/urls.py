from rest_framework.routers import DefaultRouter

from apps.intelligence.api.views import (
    GlossaryViewSet,
    IndustryModelViewSet,
    IntelligenceDatasetViewSet,
    SemanticModelViewSet,
)

router = DefaultRouter()
router.register(r"semantic-models", SemanticModelViewSet, basename="semantic-model")
router.register(r"glossary", GlossaryViewSet, basename="glossary")
router.register(r"industry-models", IndustryModelViewSet, basename="industry-model")
router.register(r"datasets", IntelligenceDatasetViewSet, basename="intelligence-dataset")

urlpatterns = router.urls
