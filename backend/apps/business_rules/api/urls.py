from rest_framework.routers import DefaultRouter

from apps.business_rules.api.views import BusinessRulesDatasetViewSet, KPIViewSet, PolicyViewSet

router = DefaultRouter()
router.register(r"kpis", KPIViewSet, basename="kpi")
router.register(r"policies", PolicyViewSet, basename="policy")
router.register(r"datasets", BusinessRulesDatasetViewSet, basename="business-rules-dataset")

urlpatterns = router.urls
