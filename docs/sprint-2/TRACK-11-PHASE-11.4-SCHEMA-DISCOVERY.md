# Track 11 Phase 11.4 — Schema Discovery Engine

**Status:** Implemented  
**Code:** `DiscoveryService`, `SchemaSnapshot`, job `connector.discover`

---

## Goal

Automated, **versioned** metadata capture via `BaseConnector.discover_schema()` — no manual column mapping.

---

## Model

`SchemaSnapshot` (`integration_schema_snapshots`):

| Field | Notes |
|-------|-------|
| `connection` | FK |
| `version` | Monotonic per connection |
| `tables` | JSON list of tables/columns/PKs/FKs/row_estimate |
| `fingerprint` | SHA-256 of canonical tables JSON |
| `discovered_at` | Last successful discovery time |
| `metadata` | Connector-provided extras |

Unique: `(connection, version)` among alive rows.

---

## Algorithm

1. Resolve connector plugin + decrypt credentials  
2. `connector.discover_schema(...)`  
3. Compute fingerprint  
4. If fingerprint matches latest → **idempotent refresh** (`changed=false`, no version bump)  
5. Else create `version = latest + 1`, set `Connection.schema_version`  

---

## API

```
POST  /api/v1/connections/{id}/discover/   → 202 { job, connection, schema }
GET   /api/v1/connections/{id}/schema/     → latest snapshot
GET   /api/v1/connections/{id}/schema/?version=N
```

---

## Job

`connector.discover` — timeout 120s, payload `{ connection_id }`

Audit: `connection.discover_enqueued`, `connection.schema_discovered`

---

## Tests

```bash
cd backend
python -m pytest tests/test_discovery.py -q
```
