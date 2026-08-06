from __future__ import annotations

import pytest
from rest_framework import status

from apps.identity.application.services import AuthService
from apps.identity.infrastructure.models import User
from tests.conftest import api_data


@pytest.mark.django_db
def test_unauthenticated_me_returns_401(api_client):
    response = api_client.get("/api/v1/auth/me/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    body = response.json()
    assert body["success"] is False


@pytest.mark.django_db
def test_dev_token_authenticates_and_creates_user(api_client):
    response = api_client.get(
        "/api/v1/auth/me/",
        HTTP_AUTHORIZATION="Bearer dev:external-uid-1:carol@example.com",
    )
    assert response.status_code == status.HTTP_200_OK
    assert api_data(response)["email"] == "carol@example.com"
    assert User.objects.filter(email="carol@example.com").exists()


@pytest.mark.django_db
def test_exchange_issues_access_token(api_client, user_a):
    response = api_client.post(
        "/api/v1/auth/exchange/",
        {"token": f"dev:{user_a.id}:{user_a.email}"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    payload = api_data(response)
    assert "access_token" in payload
    assert "refresh_token" in payload
    access = payload["access_token"]
    me = api_client.get("/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {access}")
    assert me.status_code == status.HTTP_200_OK
    assert api_data(me)["email"] == user_a.email


@pytest.mark.django_db
def test_auth_service_rejects_disabled_user(user_a):
    user_a.status = User.Status.DISABLED
    user_a.is_active = False
    user_a.save()
    with pytest.raises(Exception):
        AuthService().authenticate_bearer(f"dev:{user_a.id}:{user_a.email}")


@pytest.mark.django_db
def test_success_envelope_shape(api_client, user_a):
    response = api_client.get(
        "/api/v1/auth/me/",
        HTTP_AUTHORIZATION=f"Bearer dev:{user_a.id}:{user_a.email}",
    )
    body = response.json()
    assert body["success"] is True
    assert "data" in body and "message" in body and "errors" in body and "meta" in body
    assert body["errors"] == []
    assert "trace_id" in body["meta"]
