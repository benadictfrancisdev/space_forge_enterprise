from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.enterprise_services.api.views import (
    ConfigurationViewSet,
    FeatureFlagViewSet,
    LicensingViewSet,
    NotificationChannelViewSet,
    SearchViewSet,
    UsageViewSet,
    WebhookViewSet,
)

router = DefaultRouter(trailing_slash=True)
router.register("configuration", ConfigurationViewSet, basename="enterprise-configuration")
router.register("feature-flags", FeatureFlagViewSet, basename="enterprise-feature-flags")
router.register("search", SearchViewSet, basename="enterprise-search")
router.register("usage", UsageViewSet, basename="enterprise-usage")
router.register("licensing", LicensingViewSet, basename="enterprise-licensing")
router.register("webhooks", WebhookViewSet, basename="enterprise-webhooks")
router.register("notification-channels", NotificationChannelViewSet, basename="enterprise-notifications")

urlpatterns = [
    path("", include(router.urls)),
]
