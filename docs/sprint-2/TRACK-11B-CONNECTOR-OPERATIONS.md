# Track 11B.8 — Connector Operations Dashboard

**Status:** Complete  
**Depends on:** Track 11A sync engine, Track 10 ops platform

---

## Purpose

Expose connector health, synchronization history, success rates, and failure diagnostics through the existing `/api/v1/ops/*` infrastructure.

---

## API Endpoints

| Endpoint | Permission | Description |
|----------|------------|---------------|
| `GET /api/v1/ops/connectors/summary/` | `connection:read` | Org/workspace connector health + sync rollup |
| `GET /api/v1/ops/connectors/failures/` | `connection:read` | Recent failed sync runs with error diagnostics |
| `GET /api/v1/ops/summary/` | `ops:read` | Platform rollup now includes `connectors` section |

### Query parameters

- `organization_id` (required)
- `workspace_id` (optional, filters to one workspace)
- `hours` (optional, default `168` — sync window for stats)
- `limit` (failures endpoint only, default `20`, max `100`)

---

## Summary payload

```json
{
  "organization_id": "...",
  "connections_total": 3,
  "connections_healthy": 2,
  "connections_unhealthy": 1,
  "by_health_status": { "healthy": 2, "unhealthy": 1 },
  "by_connector_type": { "csv": 1, "platform.echo": 2 },
  "sync": {
    "total": 10,
    "succeeded": 8,
    "failed": 2,
    "success_rate_pct": 80.0,
    "rows_loaded_total": 1250
  },
  "connections": [
    {
      "connection_id": "...",
      "name": "Sales CSV",
      "connector_type": "csv",
      "health_status": "healthy",
      "last_sync_at": "...",
      "next_sync_at": null,
      "last_successful_sync_at": "...",
      "sync_success_rate_pct": 100.0,
      "rows_loaded_total": 500
    }
  ]
}
```

---

## Retry management

Failed sync runs expose `can_retry: true` when the connection is still active. Retry by re-posting:

```
POST /api/v1/connections/{id}/sync/
```

---

## Certification

```powershell
# Offline (pytest)
npm run validate:track11:pytest

# Live (requires dev:backend:lite)
npm run validate:track11b:ops
```

Report: `docs/sprint-2/reports/track11b-ops-latest.json`

---

## Implementation

- `backend/apps/integrations/application/ops_service.py` — aggregation logic
- `backend/apps/platform/api/ops_views.py` — HTTP views
- `backend/tests/test_track11b_ops.py` — API tests
