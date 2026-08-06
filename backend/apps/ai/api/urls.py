from django.urls import path

from apps.ai.api.views import AIComputeView, AIHealthView

urlpatterns = [
    path("ai/health/", AIHealthView.as_view(), name="ai-health"),
    path("ai/<str:operation>/", AIComputeView.as_view(), name="ai-compute"),
]
