# Track 11 — Integration Platform Certification

**Status:** Active (11.1–11.7)  
**Validation:** `npm run validate:track11:all`

---

## Purpose

Every Track 11 phase must pass certification **before** starting the next phase. This mirrors Track 9/10 discipline: automated pytest regression plus live API checks against `dev:backend:lite`.

---

## Workflow Under Test

```
Auth → Org → Workspace
  → Credential (secrets never in API)
  → Connection (echo / csv / excel)
  → connector.test → connector.discover → connector.sync
  → Dataset (profiled) + SyncRun history
```

---

## Commands

| Script | Requires backend | What it checks |
|--------|------------------|----------------|
| `npm run validate:track11:pytest` | No | All Track 11 pytest files (11.1–11.7) |
| `npm run validate:track11:integration` | Yes (`dev:backend:lite`) | Live echo lifecycle via REST API |
| `npm run validate:track11:all` | Pytest: no · Integration: yes | Both layers in sequence |

### Run after each phase

```powershell
# Prerequisite (once per lite DB, or after permission model changes)
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings.lite"
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_platform

# 1. Offline regression (always run first)
npm run validate:track11:pytest

# 2. Live API (backend must be running)
npm run dev:backend:lite
npm run validate:track11:integration

# 3. Full gate before merging / starting next phase
npm run validate:track11:all
```

### Direct pytest (backend only)

```powershell
cd backend
$env:DJANGO_SETTINGS_MODULE="config.settings.test"
.\.venv\Scripts\python.exe -m pytest tests/test_integrations_framework.py tests/test_credentials.py tests/test_connections.py tests/test_discovery.py tests/test_sync.py tests/test_transforms.py tests/test_csv_excel_connectors.py -q
```

---

## Pytest files (phase mapping)

| Phase | Test file |
|-------|-----------|
| 11.1 Framework | `tests/test_integrations_framework.py` |
| 11.2 Credentials | `tests/test_credentials.py` |
| 11.3 Connections | `tests/test_connections.py` |
| 11.4 Discovery | `tests/test_discovery.py` |
| 11.5 Sync | `tests/test_sync.py` |
| 11.6 Transforms | `tests/test_transforms.py` |
| 11.7 CSV/Excel | `tests/test_csv_excel_connectors.py` |
| 11B.1 REST | `tests/test_rest_api_connector.py` |
| 11B.2 PostgreSQL | `tests/test_postgresql_connector.py` |
| 11B.3–4 MySQL/SQL Server | `tests/test_sql_connectors.py` |
| 11B.5 MongoDB | `tests/test_mongodb_connector.py` |
| 11B.6 S3 | `tests/test_cloud_storage_connectors.py` |
| 11B.7 SaaS | `tests/test_saas_connectors.py` |

**Gate:** all prior files still pass when adding a new phase.

---

## Live integration checks

`scripts/validate-track11-integration.mjs` verifies:

- Connector catalog lists `platform.echo`, `csv`, `excel`
- Credential create strips secrets from response body
- Connection CRUD path (echo) with linked credential
- `POST .../test/` → `connector.test` job succeeded
- `POST .../discover/` → schema snapshot with tables
- `GET .../schema/` returns latest version
- `POST .../sync/` → 5 rows loaded, dataset created and profiled
- `GET .../sync-runs/` history populated
- `POST /api/v1/connectors/test/` draft test works

Reports: `docs/sprint-2/reports/track11-*-latest.json`

---

## Per-phase gate (required)

After implementing any phase:

1. Add or extend pytest in the matching `tests/test_*.py` file
2. Run `npm run validate:track11:pytest` — must be green
3. If API surface changed, extend `validate-track11-integration.mjs`
4. Run `npm run validate:track11:integration` with lite backend
5. Manual UI smoke on Live Connectors (create → test → discover → sync)
6. Update the phase doc with test commands and exit criteria

Do **not** start the next phase until step 2 (and 4 when applicable) pass.

---

## Track 11B extension (future)

When adding connectors (REST, PostgreSQL, etc.), add:

- `tests/test_<connector>_connector.py` per family
- Append file to `scripts/lib/track11-pytest.mjs` → `TRACK11_TEST_FILES`
- Optional: `scripts/validate-track11b-<connector>.mjs` for live sandbox checks
- Register in `validate-track11b-all.mjs` orchestrator

See [Track 11B Certification](./TRACK-11B-CERTIFICATION.md) when 11B work begins.

---

## Related docs

- [Track 11 Overview](./TRACK-11-ENTERPRISE-INTEGRATION-PLATFORM.md)
- [Phase 11.1 — Framework](./TRACK-11-PHASE-11.1-CONNECTOR-FRAMEWORK.md)
- [Phase 11.7 — CSV & Excel](./TRACK-11-PHASE-11.7-CSV-EXCEL.md)
