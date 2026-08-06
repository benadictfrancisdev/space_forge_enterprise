# Track 11 Phase 11.2 — Credential Management

**Status:** Implemented  
**Code:** `backend/apps/integrations/`

---

## Goal

Org-scoped encrypted secret store for connector auth. Secrets are write-only on create/rotate and **never** returned in API responses.

---

## Model

`Credential` (`integration_credentials`):

| Field | Notes |
|-------|-------|
| `name`, `auth_method` | Metadata for UI |
| `encrypted_payload` | Fernet ciphertext (BinaryField) |
| `key_version` | Encryption material version (default `1`) |
| `status` | `active` \| `rotated` \| `revoked` |
| `rotation_due_at`, `last_rotated_at` | Lifecycle |
| `replaces` | FK to previous credential after rotate |

---

## Encryption

- Key: `CREDENTIAL_ENCRYPTION_KEY` env, else `DJANGO_SECRET_KEY`
- Algorithm: Fernet (AES) via `cryptography`
- Key derivation: SHA-256 → url-safe base64 (stable 32-byte Fernet key)
- Module: `apps.integrations.infrastructure.encryption`

---

## API

```
POST   /api/v1/credentials/              # write-only `payload`
GET    /api/v1/credentials/?organization_id=
GET    /api/v1/credentials/{id}/
POST   /api/v1/credentials/{id}/rotate/  # write-only `payload` → new credential
DELETE /api/v1/credentials/{id}/
```

Response fields only: id, organization_id, name, auth_method, status, key_version,
rotation_due_at, last_rotated_at, replaces_id, created_at, updated_at.

---

## Permissions & audit

| Permission | Roles |
|------------|-------|
| `credential:read` | org_owner, org_admin, ws_admin |
| `credential:write` | org_owner, org_admin, ws_admin |

Audit actions: `credential.created`, `credential.rotated`, `credential.deleted`, `credential.accessed` (decrypt for connector use).

---

## Internal decrypt

`CredentialService.decrypt_for_use(...)` — for sync/discovery jobs only. Not exposed over HTTP.

---

## Tests

```bash
cd backend
python -m pytest tests/test_credentials.py -q
```

Also re-seed permissions after pull:

```bash
python manage.py seed_platform
python manage.py migrate
```
