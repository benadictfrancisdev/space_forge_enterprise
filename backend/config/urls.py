"""Root URL configuration."""
from __future__ import annotations

from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.platform.api.metrics import MetricsView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", include("apps.platform.api.health_urls")),
    path("metrics", MetricsView.as_view(), name="metrics"),
    path("api/v1/", include("apps.api.urls")),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]
