# Track 11B Phase 11B.1 — REST API Connector

**Status:** Implemented  
**Code:** `apps/integrations/connectors/rest_api_connector.py`, `connectors/_http.py`

---

## Connector

| Type | Notes |
|------|-------|
| `rest_api` | JSON over HTTP via httpx; matches Live Connectors `rest_api` source |

---

## Config

| Field | Notes |
|-------|-------|
| `url` | Endpoint URL (required unless `inline_json` for tests) |
| `method` | `GET` or `POST` (default `GET`) |
| `headers` | JSON object or string |
| `body` | POST body (JSON string or object) |
| `json_path` / `jsonPath` | Dot path to array of records, e.g. `data.items` |
| `table_name` | Logical table name (default `rest_data`) |
| `pagination_style` | `none` (default) or `offset` |
| `offset_param` / `limit_param` | Query params for offset pagination |
| `auth_style` | `bearer` (default) or `header` |
| `inline_json` | Test-only static JSON payload |

## Credentials (secrets)

| Field | Usage |
|-------|-------|
| `apiKey` / `api_key` / `token` | Bearer or custom header auth |
| `username` + `password` | HTTP Basic auth |

---

## Tests

```bash
cd backend
python -m pytest tests/test_rest_api_connector.py -q
npm run validate:track11:pytest
```

---

## UI

`rest_api` appears in Live Connectors next to CSV/Excel (Django-backed when `VITE_API_BASE_URL` is set).
