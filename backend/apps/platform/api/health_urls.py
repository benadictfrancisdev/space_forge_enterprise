from django.urls import path

from apps.platform.api.health import HealthView, ReadyView

urlpatterns = [
    path("", HealthView.as_view(), name="health"),
    path("ready/", ReadyView.as_view(), name="ready"),
]
