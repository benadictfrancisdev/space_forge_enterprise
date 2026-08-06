# Track 11B Phase 11B.2 — PostgreSQL Connector

**Status:** Implemented  
**Code:** `apps/integrations/connectors/postgresql_connector.py`, `connectors/_sql.py`

---

## Connector

| Type | Notes |
|------|-------|
| `postgresql` | Table sync via psycopg; matches Live Connectors `postgresql` source |

---

## Config

| Field | Notes |
|-------|-------|
| `host` | Database host (required unless `inline_rows`) |
| `port` | Default `5432` |
| `database` | Database name |
| `table` | `schema.table` or `table` (default schema `public`) |
| `ssl` | `true` / `false` → `sslmode=require` / `disable` |
| `order_by` | Optional ORDER BY column for full sync pagination |
| `incremental_column` | Cursor column for incremental sync |
| `inline_rows` | Test-only JSON array of row objects |

## Credentials

| Field | Usage |
|-------|-------|
| `username` | DB user (may also be in config from UI) |
| `password` | DB password (stored encrypted in credential) |

---

## Capabilities

- `test` — ping table metadata + row count
- `discover` — `information_schema.columns` + PK detection
- `sync` — batched `SELECT` with OFFSET/LIMIT (full) or `WHERE col > last_value` (incremental)

---

## Tests

```bash
cd backend
python -m pytest tests/test_postgresql_connector.py -q
npm run validate:track11:pytest
```

Live PostgreSQL (optional):

```bash
# set TRACK11_PG_* env vars and run against a real table (future validate-track11b-postgres.mjs)
```
