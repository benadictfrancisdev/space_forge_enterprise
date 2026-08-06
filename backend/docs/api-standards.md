# API Standards — `/api/v1`

## Conventions

- JSON only
- Plural resource nouns
- UUID path parameters
- `Authorization: Bearer <token>`
- Optional tenant headers: `X-Organization-ID`, `X-Workspace-ID`
- Request tracing via `X-Request-ID` (echoed on responses)

## Pagination

PageNumber pagination: `?page=1&page_size=25` (max 100).

## Filtering / sorting

Allowlisted via `django-filter` / `OrderingFilter` on viewsets that enable them. Prefer explicit query params (`organization_id`) for tenant scoping.

## Errors / success (Track 3)

```json
{
  "success": true,
  "data": {},
  "message": "",
  "errors": [],
  "meta": { "trace_id": "..." }
}
```

Failures set `success: false`, populate `errors[]`, and keep HTTP status codes (401/403/404/422/500).

## Idempotency

Clients may send `Idempotency-Key` on create endpoints in later phases. Phase 0.1 relies on unique constraints (slugs, memberships).

## Rate limiting

Strategy: edge/API gateway rate limits per API key / user in production; application hooks reserved for Phase 0.2.

## Key endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | /api/v1/auth/exchange/ | public |
| GET | /api/v1/auth/me/ | required |
| GET/POST | /api/v1/organizations/ | required |
| GET/POST | /api/v1/workspaces/ | required |
| GET/POST | /api/v1/storage/objects/ | required |
| GET/POST | /api/v1/datasets/ | required |
| GET/POST | /api/v1/jobs/ | required |
| GET/POST | /api/v1/notifications/ | required |
| GET | /health/ | public |
| GET | /health/ready/ | public |
