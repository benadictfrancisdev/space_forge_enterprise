# Track 8.3 — Database Performance & Pagination

**Status:** Complete  
**Date:** 2026-08-03

---

## Goal

Make list endpoints scalable with composite indexes, DRF pagination, and lean dataset list queries.

---

## Deliverables

| Change | Location |
|--------|----------|
| Composite indexes | `datasets`, `jobs`, `audit_logs`, `storage_objects`, `workspaces`, `notifications` |
| Pagination helper | `backend/apps/api/pagination.py` → `paginate_and_serialize()` |
| Paginated list endpoints | datasets, jobs, storage, workspaces, orgs, notifications, audit |
| Lean dataset list | `DatasetListSerializer` — no `schema`/`statistics` on list |
| Query optimization | `select_related`, `defer`, `order_by` aligned with indexes |
| Audit N+1 fix | `select_related("actor")` on audit list |

---

## Pagination

All list endpoints accept `?page=1&page_size=25` (max 100).

Envelope shape (via `EnvelopeJSONRenderer`):

```json
{
  "success": true,
  "data": [ /* page items */ ],
  "meta": { "count": 42, "next": "...", "previous": null, "page_size": 25 }
}
```

Frontend `listDatasets()` continues to receive an array in `data` — no breaking change for current consumers.

---

## Indexes Added

| Table | Index | Purpose |
|-------|-------|---------|
| `datasets` | `(organization_id, -created_at)` | Org dataset list |
| `datasets` | `(workspace_id, status)` | Workspace filter |
| `jobs` | `(organization_id, status, -created_at)` | Job board |
| `jobs` | `(organization_id, -priority, -created_at)` | Priority ordering |
| `audit_logs` | `(organization_id, -created_at)` | Audit feed |
| `storage_objects` | `(organization_id, -created_at)` | Storage list |
| `workspaces` | `(organization_id, -created_at)` | Workspace list |
| `notifications` | `(user, organization_id, -created_at)` | Inbox |

Migrations: `000*_track8_perf_indexes.py` per app.

---

## Validation

```bash
cd backend && python manage.py migrate
pytest tests/test_pagination.py tests/test_datasets.py -q
```

---

## Next

**Phase 8.4** — Sprint 2 architecture design docs (no implementation).
