# Track 11B Phase 11B.3 — MySQL Connector

**Status:** Implemented  
**Code:** `apps/integrations/connectors/mysql_connector.py`

---

## Connector

| Type | Notes |
|------|-------|
| `mysql` | Table sync via PyMySQL |

## Config

| Field | Notes |
|-------|-------|
| `host`, `port` (3306), `database`, `table` | `database.table` or `table` |
| `order_by`, `incremental_column` | Optional sync tuning |
| `inline_rows` | Test-only JSON rows |

## Credentials

`username` + `password` (encrypted credential)

## Tests

```bash
python -m pytest tests/test_sql_connectors.py -q
```
