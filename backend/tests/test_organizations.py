from __future__ import annotations

import pytest
from rest_framework import status

from apps.audit.infrastructure.models import AuditLog
from apps.events.infrastructure.models import OutboxEvent
from apps.memberships.infrastructure.models import Membership
from apps.organizations.infrastructure.models import Organization
from apps.workspaces.infrastructure.models import Workspace
from tests.conftest import api_data


@pytest.mark.django_db
def test_create_organization_and_workspace(auth_client, user_a):
    org_resp = auth_client.post(
        "/api/v1/organizations/",
        {"name": "Acme Analytics"},
        format="json",
    )
    assert org_resp.status_code == status.HTTP_201_CREATED
    org_id = api_data(org_resp)["id"]
    assert Organization.objects.filter(id=org_id).exists()
    assert Membership.objects.filter(organization_id=org_id, user=user_a).exists()
    assert AuditLog.objects.filter(action="organization.created", resource_id=org_id).exists()
    assert OutboxEvent.objects.filter(event_type="organization.created").exists()

    ws_resp = auth_client.post(
        "/api/v1/workspaces/",
        {"organization_id": org_id, "name": "Production"},
        format="json",
    )
    assert ws_resp.status_code == status.HTTP_201_CREATED
    assert Workspace.objects.filter(organization_id=org_id, name="Production").exists()


@pytest.mark.django_db
def test_list_organizations_only_memberships(auth_client, auth_client_b, user_a, user_b):
    org_a = api_data(
        auth_client.post("/api/v1/organizations/", {"name": "Org A"}, format="json")
    )
    auth_client_b.post("/api/v1/organizations/", {"name": "Org B"}, format="json")

    listed = auth_client.get("/api/v1/organizations/")
    assert listed.status_code == status.HTTP_200_OK
    ids = {item["id"] for item in api_data(listed)}
    assert org_a["id"] in ids
    bob_orgs = {str(m.organization_id) for m in Membership.objects.filter(user=user_b)}
    assert not (ids & bob_orgs)
