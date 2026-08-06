# Track 11 Phase 11.5 — Synchronization Engine

**Status:** Implemented  
**Code:** `SyncService`, `SyncRun`, job `connector.sync`

---

## Goal

Extract rows via `BaseConnector.extract`, write CSV to storage, create/update Dataset via `DatasetService`, auto-profile. Supports **full** and **incremental** (cursor resume).

---

## Model

`SyncRun` (`integration_sync_runs`):

| Field | Notes |
|-------|-------|
| `connection`, `job` | FKs |
| `mode` | `full` \| `incremental` |
| `status` | queued → running → succeeded/failed/cancelled |
| `rows_extracted` / `rows_loaded` | Counters |
| `cursor_state` | Opaque JSON for incremental resume |
| `storage_object` / `dataset` | Outputs |

---

## Algorithm

1. Create `SyncRun`, enqueue `connector.sync`
2. Resolve connector + credentials
3. Auto-discover if `schema_version == 0`
4. Extract batches (honor cancel + progress)
5. Flush CSV → `StorageService.upload`
6. Create or bind `Dataset` on `Connection.target_dataset`
7. `DatasetService.enqueue_profile`
8. Update `Connection.last_sync_at` + cursor on `SyncRun`

---

## API

```
POST  /api/v1/connections/{id}/sync/       { mode?, batch_size? } → 202
GET   /api/v1/connections/{id}/sync-runs/
```

---

## Tests

```bash
cd backend
python -m pytest tests/test_sync.py -q
```
