"""Track 11.2 — credential management API and encryption tests."""
from __future__ import annotations

import pytest
from rest_framework import status

from apps.audit.infrastructure.models import AuditLog
from apps.integrations.application.credential_service import CredentialService
from apps.integrations.infrastructure.encryption import decrypt_payload, encrypt_payload
from apps.integrations.infrastructure.models import Credential
from apps.memberships.infrastructure.models import Membership
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService
from apps.permissions.infrastructure.models import Role
from tests.conftest import api_data


def test_encrypt_decrypt_roundtrip(settings):
    settings.CREDENTIAL_ENCRYPTION_KEY = "unit-test-credential-key-spaceforge"
    blob = encrypt_payload({"username": "alice", "password": "s3cret"})
    assert isinstance(blob, (bytes, memoryview))
    assert b"s3cret" not in bytes(blob)
    assert decrypt_payload(blob) == {"username": "alice", "password": "s3cret"}


@pytest.mark.django_db
def test_credential_crud_strips_secrets(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Cred Co"}, format="json"))

    created = auth_client.post(
        "/api/v1/credentials/",
        {
            "organization_id": org["id"],
            "name": "Prod Postgres",
            "auth_method": "password",
            "payload": {"username": "dbuser", "password": "hunter2"},
        },
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED
    body = created.json()
    assert body["success"] is True
    data = api_data(created)
    assert data["name"] == "Prod Postgres"
    assert data["auth_method"] == "password"
    assert data["status"] == "active"
    assert "encrypted_payload" not in data
    assert "payload" not in data
    assert "hunter2" not in created.content.decode()
    assert "dbuser" not in created.content.decode()

    listed = auth_client.get(f"/api/v1/credentials/?organization_id={org['id']}")
    assert listed.status_code == status.HTTP_200_OK
    items = api_data(listed)
    assert isinstance(items, list)
    assert len(items) == 1
    assert "encrypted_payload" not in items[0]
    assert "hunter2" not in listed.content.decode()

    detail = auth_client.get(f"/api/v1/credentials/{data['id']}/")
    assert detail.status_code == status.HTTP_200_OK
    assert "encrypted_payload" not in api_data(detail)

    # Secret still decryptable server-side
    row = Credential.objects.get(id=data["id"])
    assert decrypt_payload(row.encrypted_payload)["password"] == "hunter2"

    deleted = auth_client.delete(f"/api/v1/credentials/{data['id']}/")
    assert deleted.status_code == status.HTTP_204_NO_CONTENT
    assert not Credential.objects.filter(id=data["id"]).exists()
    assert Credential.all_objects.get(id=data["id"]).status == Credential.Status.REVOKED

    assert AuditLog.objects.filter(
        organization_id=org["id"], action="credential.created"
    ).exists()
    assert AuditLog.objects.filter(
        organization_id=org["id"], action="credential.deleted"
    ).exists()


@pytest.mark.django_db
def test_credential_rotate_marks_old_and_creates_new(auth_client, user_a):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Rotate Co"}, format="json"))
    created = api_data(
        auth_client.post(
            "/api/v1/credentials/",
            {
                "organization_id": org["id"],
                "name": "API Key",
                "auth_method": "api_key",
                "payload": {"api_key": "old-key"},
            },
            format="json",
        )
    )

    rotated = auth_client.post(
        f"/api/v1/credentials/{created['id']}/rotate/",
        {"payload": {"api_key": "new-key"}},
        format="json",
    )
    assert rotated.status_code == status.HTTP_201_CREATED
    new = api_data(rotated)
    assert new["id"] != created["id"]
    assert new["name"] == "API Key"
    assert new["replaces_id"] == created["id"]
    assert new["last_rotated_at"] is not None
    assert "new-key" not in rotated.content.decode()

    old = Credential.objects.get(id=created["id"])
    assert old.status == Credential.Status.ROTATED

    active = list(
        CredentialService().list(organization_id=org["id"], user=user_a)
    )
    assert len(active) == 1
    assert str(active[0].id) == new["id"]
    assert (
        CredentialService().decrypt_for_use(credential_id=new["id"], user=user_a)["api_key"]
        == "new-key"
    )

    assert AuditLog.objects.filter(
        organization_id=org["id"], action="credential.rotated"
    ).exists()
    assert AuditLog.objects.filter(
        organization_id=org["id"], action="credential.accessed"
    ).exists()


@pytest.mark.django_db
def test_credential_tenant_isolation(auth_client, auth_client_b):
    org_a = api_data(
        auth_client.post("/api/v1/organizations/", {"name": "Cred A"}, format="json")
    )
    org_b = api_data(
        auth_client_b.post("/api/v1/organizations/", {"name": "Cred B"}, format="json")
    )
    cred_a = api_data(
        auth_client.post(
            "/api/v1/credentials/",
            {
                "organization_id": org_a["id"],
                "name": "Secret A",
                "auth_method": "token",
                "payload": {"token": "aaa"},
            },
            format="json",
        )
    )

    hijack = auth_client_b.get(f"/api/v1/credentials/{cred_a['id']}/")
    assert hijack.status_code == status.HTTP_403_FORBIDDEN

    list_b = auth_client_b.get(f"/api/v1/credentials/?organization_id={org_a['id']}")
    assert list_b.status_code == status.HTTP_403_FORBIDDEN

    # Org B cannot create under Org A
    create_hijack = auth_client_b.post(
        "/api/v1/credentials/",
        {
            "organization_id": org_a["id"],
            "name": "Steal",
            "auth_method": "token",
            "payload": {"token": "x"},
        },
        format="json",
    )
    assert create_hijack.status_code == status.HTTP_403_FORBIDDEN
    _ = org_b  # org_b created for membership isolation side effects


@pytest.mark.django_db
def test_org_member_cannot_write_credentials(user_a, user_b):
    org = OrganizationService().create(name="Member Creds", owner=user_a)
    member_role = Role.objects.get(code=Role.Codes.ORG_MEMBER, scope=Role.Scope.ORGANIZATION)
    Membership.objects.create(
        organization_id=org.id,
        user=user_b,
        role=member_role,
        created_by=user_a,
        updated_by=user_a,
    )
    perms = PermissionService()
    assert perms.has(user=user_a, organization_id=org.id, permission="credential:write")
    assert not perms.has(user=user_b, organization_id=org.id, permission="credential:write")
    assert not perms.has(user=user_b, organization_id=org.id, permission="credential:read")
