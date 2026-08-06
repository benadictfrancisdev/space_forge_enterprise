# Backend Architecture — Phase 0.1

## Style

- **Modular monolith** with domain apps, ready to extract microservices later
- **Clean Architecture** layers per domain: `api` → `application` → `domain` / `infrastructure`
- **No business logic in viewsets** — services own use cases
- **Repository-style ORM access** isolated in infrastructure models + application services
- **Transactional outbox** for platform events
- **Celery** for background jobs

## Runtime topology

```
Frontend (stubs)
    → REST /api/v1
        → Django API (DRF)
            → Domain services
                → PostgreSQL
                → Redis (cache / broker)
                → MinIO (S3)
            → Celery workers
```

## Auth bridge

1. Client presents Firebase ID token (or `dev:` token in development)
2. `IdentityProvider` verifies claims
3. User is upserted in `identity_users`
4. Optional exchange endpoint issues SpaceForge HS256 access JWT
5. `TenantContextMiddleware` reads `X-Organization-ID` / `X-Workspace-ID`

## Tenant isolation

Every tenant resource stores `organization_id`. Application services resolve membership before reads/writes. Cross-tenant access returns 403.

## Soft deletes & IDs

UUID primary keys; `deleted_at` soft deletes via `SoftDeleteManager`.
