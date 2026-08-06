# Track 11B Phase 11B.5 — MongoDB Connector

**Status:** Implemented  
**Code:** `apps/integrations/connectors/mongodb_connector.py`, `connectors/_document.py`

---

## Connector

| Type | Notes |
|------|-------|
| `mongodb` | Collection sync via pymongo |

## Config

| Field | Notes |
|-------|-------|
| `host`, `port` (27017), `database`, `collection` | Required |
| `filter` | Optional MongoDB query JSON |
| `incremental_column` | Default `_id` |
| `inline_documents` | Test-only document array |

## Credentials

`username` + `password`, or `connection_uri` / `uri` for full connection string.

## Tests

```bash
python -m pytest tests/test_mongodb_connector.py -q
```
