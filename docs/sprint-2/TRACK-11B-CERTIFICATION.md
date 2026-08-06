# Track 11B — Connector Expansion Certification

**Status:** Complete (11B.1–11B.9)  
**Depends on:** [Track 11 Certification](./TRACK-11-CERTIFICATION.md) (11.1–11.7 green)

---

## Rule

**Test after every 11B phase.** No connector ships without:

1. Unit tests (connector class, no network or mocked transport)
2. API integration tests (`auth_client` + eager Celery)
3. Full Track 11 regression (`npm run validate:track11:pytest`)
4. Live certification script when sandbox credentials exist
5. Manual Live Connectors UI smoke

---

## Planned phases and test files

| Phase | Connector / feature | New test file | Live script (planned) |
|-------|---------------------|---------------|------------------------|
| 11B.1 | REST / HTTP API | `test_rest_api_connector.py` ✅ | `validate-track11b-rest.mjs` (pending) |
| 11B.2 | PostgreSQL | `test_postgresql_connector.py` ✅ | `validate-track11b-postgres.mjs` (pending) |
| 11B.3 | MySQL | `test_sql_connectors.py` ✅ | shared SQL base |
| 11B.4 | SQL Server | `test_sql_connectors.py` ✅ | shared SQL base |
| 11B.5 | MongoDB | `test_mongodb_connector.py` ✅ | `validate-track11b-mongo.mjs` (pending) |
| 11B.6 | Cloud storage (S3) | `test_cloud_storage_connectors.py` ✅ | MinIO / AWS sandbox |
| 11B.7 | SaaS pilots | `test_saas_connectors.py` ✅ | sandbox credentials only |
| 11B.8 | Connector ops dashboard | `test_track11b_ops.py` ✅ | `validate-track11b-ops.mjs` ✅ |
| 11B.9 | Enterprise exit | `test_track11b_exit.py` ✅ | `validate-track11b-all.mjs` ✅ |

---

## Minimum tests per new connector

Copy the CSV/Excel pattern (`tests/test_csv_excel_connectors.py`):

1. Registered in `ConnectorRegistry.list_types()`
2. `test_connection` succeeds with valid config
3. `discover_schema` returns expected tables/columns
4. `extract` batches until `has_more=False`
5. API E2E: create connection → test → discover → sync → correct `rows_loaded`
6. `target_dataset_id` set; storage object exists
7. Tenant isolation (org B cannot access org A connection)
8. Secrets never appear in API responses

---

## Regression command (always run)

```powershell
npm run validate:track11:pytest
```

When 11B scripts exist:

```powershell
npm run validate:track11b:all
```

Exit documentation: [TRACK-11B-EXIT.md](./TRACK-11B-EXIT.md)

---

## Orchestrator (to implement with 11B)

`scripts/validate-track11b-all.mjs` will run:

1. `validate-track11-pytest.mjs` (11A regression)
2. Per-connector live scripts (as implemented)
3. `validate-track11b-ops.mjs` (when ops dashboard lands)
4. Security / isolation slice (reuse Track 9 security patterns)

Reports: `docs/sprint-2/reports/track11b-*-latest.json`
