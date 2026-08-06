# Track 11 Phase 11.1 — Connector Framework

**Status:** Implemented  
**Code:** `backend/apps/integrations/`

---

## Goal

Ship the plugin contract with **zero real connectors**. Everything else (credentials, connections, sync) depends on this interface.

Pattern mirror: `ObjectStorageProvider` in `apps/storage/domain/provider.py`.

---

## Plugin interface

Every connector implements `BaseConnector`:

| Method / property | Purpose |
|-------------------|---------|
| `connector_type` | Stable type string (e.g. `platform.echo`, `postgresql`) |
| `version` | Semver string for registry resolution |
| `capabilities` | Full/incremental/discovery/scheduled flags |
| `get_config_schema()` | JSON Schema for UI forms (non-secret config) |
| `test_connection(config, credentials)` | Fast connectivity check |
| `discover_schema(config, credentials)` | Tables/columns/PKs/FKs |
| `extract(config, credentials, cursor, mode, batch_size)` | Next batch of rows + next cursor |

---

## Registry

`ConnectorRegistry` registers plugins by `(connector_type, version)` and resolves by type (latest version) or exact type+version.

Builtin registration: `apps.integrations.connectors` imports the echo connector on first `get_connector_registry()` call.

---

## Echo connector (`platform.echo`)

Certification stub — no network I/O:

- `test_connection` → always ok
- `discover_schema` → one fake table `echo_items`
- `extract` → deterministic rows; cursor advances until empty

---

## Out of scope (later phases)

- Credential / Connection models
- API endpoints
- Job types `connector.test|discover|sync`
- Real connectors (CSV, REST, databases)

---

## Tests

```bash
cd backend
python -m pytest tests/test_integrations_framework.py -q
```
