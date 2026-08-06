from __future__ import annotations

from django.http import HttpResponse
from django.views import View

from apps.core import metrics


class MetricsView(View):
    """Prometheus-compatible metrics scrape endpoint (Track 10.2)."""

    def get(self, request):
        body = metrics.render_prometheus()
        return HttpResponse(body, content_type="text/plain; version=0.0.4; charset=utf-8")
