from django.urls import path

from apps.identity.api.views import (
    ExchangeTokenView,
    LogoutAllView,
    LogoutView,
    MeView,
    RefreshTokenView,
    SessionListView,
)

urlpatterns = [
    path("auth/exchange/", ExchangeTokenView.as_view(), name="auth-exchange"),
    path("auth/refresh/", RefreshTokenView.as_view(), name="auth-refresh"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/logout-all/", LogoutAllView.as_view(), name="auth-logout-all"),
    path("auth/sessions/", SessionListView.as_view(), name="auth-sessions"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
]
