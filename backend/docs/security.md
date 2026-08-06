# Security Architecture

## Authentication

- Temporary bridge: Firebase ID tokens (`AUTH_MODE=firebase`)
- Dev bridge: `dev:<subject>:<email>` and HS256 JWTs (`AUTH_MODE=dev`)
- Enterprise abstraction: `IdentityProvider` interface
- SpaceForge access JWT issued via `/auth/exchange/`

## Authorization

- RBAC via roles → permissions
- System roles seeded: org_owner, org_admin, org_member, workspace_admin, workspace_member
- Checks enforced in application services (`PermissionService.require`)

## Tenant isolation

- Membership gate on every org-scoped operation
- Tests assert cross-tenant 403s

## Secrets

- Environment variables / `.env` (never commit production secrets)
- Abstracted settings in `config/settings`

## Audit

- Mutations write `audit_logs` with actor, action, before/after, `trace_id`

## Files

- Objects stored under `orgs/<org_id>/...` keys
- Metadata in Postgres; binaries in S3-compatible storage
