# Track 11 Phase 11.3 — Connection Registry

**Status:** Implemented  
**Code:** `backend/apps/integrations/` + frontend Django adapter

---

## Goal

Persist integrations as org/workspace-scoped `Connection` records. Users can create a connection, run `connector.test` (via Track 6 jobs), and see health in the UI. Sync remains Track 11.5.

---

## Model

`Connection` (`integration_connections`):

| Field | Notes |
|-------|-------|
| `workspace_id` | Tenant scope with org |
| `connector_type` / `connector_version` | Plugin identity |
| `credential` | Optional FK — secrets never in `config` |
| `config` | Non-secret JSON |
| `health_status` | `unknown` \| `testing` \| `healthy` \| `unhealthy` |
| `sync_schedule` | `manual` / cron-like string |
| `target_dataset` | Optional FK (filled by sync later) |

---

## API

```
GET/POST            /api/v1/connections/
GET/PATCH/DELETE    /api/v1/connections/{id}/
POST                /api/v1/connections/{id}/test/   → 202 + job + connection
GET                 /api/v1/connectors/              → installed plugins
POST                /api/v1/connectors/test/         → draft test (no persist)
```

---

## Job

| Type | Worker |
|------|--------|
| `connector.test` | Decrypt credential → `BaseConnector.test_connection` → update health |

Eager Celery (lite/test) completes before the 202 response returns.

---

## Permissions

`connection:read` / `connection:write` — org_owner, org_admin, ws_admin

Audit: `connection.created|updated|deleted|test_enqueued|tested`

---

## Frontend

When `VITE_API_BASE_URL` is set, `live-connectors` invokes route to Django (`djangoConnectors.ts`). localStorage mock remains the offline fallback.

UI source **Platform Echo (dev)** exercises the full create → test → healthy path.

Sync / load / runs actions return a clear 11.5-not-ready message.

---

## Tests

```bash
cd backend
python -m pytest tests/test_connections.py -q
```

```bash
python manage.py migrate
python manage.py seed_platform
```
