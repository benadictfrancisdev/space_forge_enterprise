# Track 11 Phase 11.6 — Transformation Pipeline

**Status:** Implemented  
**Code:** `TransformService`, `TransformRule`, applied inside `connector.sync`

---

## Goal

Declarative JSON transform steps between extract and storage. Ship rename + cast + null handling first.

---

## Model

`TransformRule` (`integration_transform_rules`):

| Field | Notes |
|-------|-------|
| `connection` | FK |
| `name` | Label |
| `table_name` | Empty = all tables |
| `steps` | Ordered JSON ops |
| `is_active` / `priority` | Selection + order |

---

## Supported ops

```json
[
  {"op": "rename", "mapping": {"message": "msg"}},
  {"op": "cast", "columns": {"id": "integer", "amount": "float"}},
  {"op": "nulls", "fill": {"msg": ""}, "drop_if_null": ["id"]}
]
```

Cast targets: `string`, `integer`, `float`, `boolean`, `date`.

---

## API

```
GET/POST   /api/v1/connections/{id}/transform-rules/
GET/PATCH/DELETE  /api/v1/transform-rules/{id}/
```

---

## Sync integration

`SyncService.run_sync_for_job` applies active rules after extract, before CSV upload.

---

## Tests

```bash
cd backend
python -m pytest tests/test_transforms.py tests/test_sync.py tests/test_discovery.py tests/test_connections.py tests/test_credentials.py tests/test_integrations_framework.py -q
```
