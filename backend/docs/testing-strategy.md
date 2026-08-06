# Testing Strategy

## Layers

1. **Unit** — PermissionService, slug helpers, token services
2. **API integration** — DRF client against real URLs
3. **Auth** — missing token 401, dev token upsert, JWT exchange
4. **Tenant isolation** — cross-org 403
5. **Permissions** — member cannot update org
6. **Jobs** — eager Celery success + notification side effect

## Commands

```bash
pytest
pytest tests/test_tenant_isolation.py -q
```

## CI expectations

- `pytest` exit 0 required for merge
- Docker compose smoke: `/health/` and `/health/ready/` return 200
