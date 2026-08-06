from __future__ import annotations

import pytest
from rest_framework import status

from tests.conftest import api_data


@pytest.mark.django_db
def test_tenant_isolation_blocks_cross_org_access(auth_client, auth_client_b, user_a, user_b):
    org_a = api_data(
        auth_client.post("/api/v1/organizations/", {"name": "Tenant A"}, format="json")
    )
    org_b = api_data(
        auth_client_b.post("/api/v1/organizations/", {"name": "Tenant B"}, format="json")
    )

    forbidden = auth_client.get(f"/api/v1/organizations/{org_b['id']}/")
    assert forbidden.status_code == status.HTTP_403_FORBIDDEN
    assert forbidden.json()["success"] is False

    ws_list = auth_client.get(f"/api/v1/workspaces/?organization_id={org_b['id']}")
    assert ws_list.status_code == status.HTTP_403_FORBIDDEN

    create_ws = auth_client_b.post(
        "/api/v1/workspaces/",
        {"organization_id": org_a["id"], "name": "Hijack"},
        format="json",
    )
    assert create_ws.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_member_role_cannot_update_organization(user_a, user_b):
    from apps.organizations.application.services import OrganizationService
    from apps.permissions.application.services import PermissionService
    from apps.permissions.infrastructure.models import Role
    from apps.memberships.infrastructure.models import Membership

    org = OrganizationService().create(name="Restricted", owner=user_a)
    member_role = Role.objects.get(code=Role.Codes.ORG_MEMBER, scope=Role.Scope.ORGANIZATION)
    Membership.objects.create(
        organization_id=org.id,
        user=user_b,
        role=member_role,
        created_by=user_a,
        updated_by=user_a,
    )

    perms = PermissionService()
    assert perms.has(user=user_a, organization_id=org.id, permission="org:update")
    assert not perms.has(user=user_b, organization_id=org.id, permission="org:update")
    assert perms.has(user=user_b, organization_id=org.id, permission="org:read")
