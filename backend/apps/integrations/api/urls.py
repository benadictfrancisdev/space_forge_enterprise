from rest_framework.routers import DefaultRouter

from apps.integrations.api.views import (
    ConnectionViewSet,
    ConnectorCatalogViewSet,
    CredentialViewSet,
    TransformRuleViewSet,
)

router = DefaultRouter()
router.register(r"credentials", CredentialViewSet, basename="credential")
router.register(r"connections", ConnectionViewSet, basename="connection")
router.register(r"connectors", ConnectorCatalogViewSet, basename="connector-catalog")
router.register(r"transform-rules", TransformRuleViewSet, basename="transform-rule")

urlpatterns = router.urls
