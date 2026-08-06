# Track 11B Phase 11B.4 — SQL Server Connector

**Status:** Implemented  
**Code:** `apps/integrations/connectors/sqlserver_connector.py`

---

## Connector

| Type | Notes |
|------|-------|
| `sqlserver` | Table sync via pymssql |

## Config

| Field | Notes |
|-------|-------|
| `host`, `port` (1433), `database`, `table` | `schema.table` or `table` (default schema `dbo`) |
| `order_by`, `incremental_column` | Optional sync tuning |
| `inline_rows` | Test-only JSON rows |

## Credentials

`username` + `password` (encrypted credential)

## Pagination

Uses `OFFSET … ROWS FETCH NEXT … ROWS ONLY` (SQL Server 2012+).

## Tests

```bash
python -m pytest tests/test_sql_connectors.py -q
```
