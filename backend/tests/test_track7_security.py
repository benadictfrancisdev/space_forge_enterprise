from __future__ import annotations

import pytest
from rest_framework import status

from apps.audit.infrastructure.models import AuditLog
from apps.identity.infrastructure.models import AuthSession
from tests.conftest import api_data


@pytest.mark.django_db
def test_exchange_issues_refresh_and_session(api_client, user_a):
    response = api_client.post(
        "/api/v1/auth/exchange/",
        {"token": f"dev:{user_a.id}:{user_a.email}", "device_label": "pytest"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    payload = api_data(response)
    assert payload["access_token"]
    assert payload["refresh_token"]
    assert payload["session_id"]
    assert AuthSession.objects.filter(user=user_a, revoked_at__isnull=True).exists()
    assert AuditLog.objects.filter(action="auth.login", actor=user_a).exists()

    me = api_client.get(
        "/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {payload['access_token']}"
    )
    assert me.status_code == status.HTTP_200_OK


@pytest.mark.django_db
def test_refresh_rotates_token(api_client, user_a):
    exchanged = api_data(
        api_client.post(
            "/api/v1/auth/exchange/",
            {"token": f"dev:{user_a.id}:{user_a.email}"},
            format="json",
        )
    )
    old_refresh = exchanged["refresh_token"]
    refreshed = api_client.post(
        "/api/v1/auth/refresh/",
        {"refresh_token": old_refresh},
        format="json",
    )
    assert refreshed.status_code == status.HTTP_200_OK
    body = api_data(refreshed)
    assert body["refresh_token"] != old_refresh
    assert body["access_token"]

    # Reuse of old refresh → family revoked
    reuse = api_client.post(
        "/api/v1/auth/refresh/",
        {"refresh_token": old_refresh},
        format="json",
    )
    assert reuse.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_logout_revokes_session(api_client, user_a):
    exchanged = api_data(
        api_client.post(
            "/api/v1/auth/exchange/",
            {"token": f"dev:{user_a.id}:{user_a.email}"},
            format="json",
        )
    )
    access = exchanged["access_token"]
    logout = api_client.post(
        "/api/v1/auth/logout/",
        format="json",
        HTTP_AUTHORIZATION=f"Bearer {access}",
    )
    assert logout.status_code == status.HTTP_200_OK
    assert api_data(logout)["revoked"] is True

    me = api_client.get("/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {access}")
    assert me.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_logout_all_devices(api_client, user_a):
    s1 = api_data(
        api_client.post(
            "/api/v1/auth/exchange/",
            {"token": f"dev:{user_a.id}:{user_a.email}", "device_label": "a"},
            format="json",
        )
    )
    s2 = api_data(
        api_client.post(
            "/api/v1/auth/exchange/",
            {"token": f"dev:{user_a.id}:{user_a.email}", "device_label": "b"},
            format="json",
        )
    )
    assert AuthSession.objects.filter(user=user_a, revoked_at__isnull=True).count() == 2

    resp = api_client.post(
        "/api/v1/auth/logout-all/",
        format="json",
        HTTP_AUTHORIZATION=f"Bearer {s1['access_token']}",
    )
    assert resp.status_code == status.HTTP_200_OK
    assert api_data(resp)["revoked_sessions"] == 2
    assert AuthSession.objects.filter(user=user_a, revoked_at__isnull=True).count() == 0

    # Both access tokens invalid
    assert (
        api_client.get(
            "/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {s1['access_token']}"
        ).status_code
        == status.HTTP_401_UNAUTHORIZED
    )
    assert (
        api_client.get(
            "/api/v1/auth/me/", HTTP_AUTHORIZATION=f"Bearer {s2['access_token']}"
        ).status_code
        == status.HTTP_401_UNAUTHORIZED
    )


@pytest.mark.django_db
def test_list_sessions(api_client, user_a):
    exchanged = api_data(
        api_client.post(
            "/api/v1/auth/exchange/",
            {"token": f"dev:{user_a.id}:{user_a.email}"},
            format="json",
        )
    )
    listed = api_client.get(
        "/api/v1/auth/sessions/",
        HTTP_AUTHORIZATION=f"Bearer {exchanged['access_token']}",
    )
    assert listed.status_code == status.HTTP_200_OK
    sessions = api_data(listed)
    assert len(sessions) >= 1
    assert any(s.get("is_current") for s in sessions)


@pytest.mark.django_db
def test_security_headers_present(api_client):
    response = api_client.get("/api/v1/auth/me/")
    assert response["X-Content-Type-Options"] == "nosniff"
    assert response["X-Frame-Options"] == "DENY"
    assert "Referrer-Policy" in response
    assert response["Cache-Control"] == "no-store"


@pytest.mark.django_db
def test_audit_list_requires_permission(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Audit Co"}, format="json"))
    listed = auth_client.get(f"/api/v1/audit/?organization_id={org['id']}")
    assert listed.status_code == status.HTTP_200_OK
    logs = api_data(listed)
    assert any(row["action"] == "organization.created" for row in logs)


@pytest.mark.django_db
def test_dataset_workspace_must_belong_to_org(auth_client, auth_client_b):
    org_a = api_data(auth_client.post("/api/v1/organizations/", {"name": "A"}, format="json"))
    org_b = api_data(auth_client_b.post("/api/v1/organizations/", {"name": "B"}, format="json"))
    ws_b = api_data(
        auth_client_b.post(
            "/api/v1/workspaces/",
            {"organization_id": org_b["id"], "name": "B-WS"},
            format="json",
        )
    )
    hijack = auth_client.post(
        "/api/v1/datasets/",
        {
            "organization_id": org_a["id"],
            "workspace_id": ws_b["id"],
            "name": "Hijack",
        },
        format="json",
    )
    assert hijack.status_code == status.HTTP_400_BAD_REQUEST
