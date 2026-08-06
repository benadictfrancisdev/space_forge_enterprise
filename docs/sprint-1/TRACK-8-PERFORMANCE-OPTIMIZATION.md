# Track 8 — Performance Optimization (Database, API, AI, Frontend)

**Status:** 🟢 Active (Phases 8.3 & 8.6)  
**Date:** 2026-08-03  
**Owner:** Performance & Infrastructure Engineering  

---

## Performance Metrics & Targets

| Subsystem | Metric | Current Baseline | Target Threshold | Status |
| :--- | :--- | :--- | :--- | :---: |
| **Database** | Metadata Query Latency | ~120ms | < 25ms | ✅ Optimized |
| **Database** | Dataset Profile Insertion | ~450ms | < 100ms | ✅ Optimized |
| **API Backend** | `/api/v1/datasets/` List | ~180ms | < 45ms | ✅ Fast |
| **API Backend** | `/api/v1/ai/compute/` Overhead | ~85ms | < 30ms | ✅ Fast |
| **AI Gateway** | Response Latency (Chat/NLP) | ~1.8s | < 1.2s | ✅ Bounded |
| **Frontend** | React Dashboard Mount | ~350ms | < 120ms | ✅ Lazy Loaded |
| **Frontend** | Bundle Size (Gzipped initial) | ~420KB | < 350KB | ✅ Split |

---

## 1. Database Indexing & Query Optimizations (Phase 8.3)

### PostgreSQL Indexes Applied
To maintain sub-25ms dataset retrieval and job queries under scale:

```sql
-- Organization & Workspace Dataset Indexing
CREATE INDEX IF NOT EXISTS idx_datasets_org_created 
ON datasets_dataset (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_datasets_ws_status 
ON datasets_dataset (workspace_id, status);

-- Background Job Status & Priority Indexing
CREATE INDEX IF NOT EXISTS idx_jobs_org_status_created 
ON jobs_job (organization_id, status, created_at DESC);

-- Audit Log Time-Series Indexing
CREATE INDEX IF NOT EXISTS idx_audit_org_timestamp 
ON audit_auditlog (organization_id, timestamp DESC);
```

### Query Plan Guidelines
1. **Selective Selects**: Avoid `SELECT *` on large dataset tables when listing metadata; query only `id`, `name`, `row_count`, `column_count`, `status`, `created_at`.
2. **Paginated Results**: Apply limit/offset or cursor-based pagination for history logs and notification channels.
3. **Bulk Operations**: Bulk upload data points using copy streams or multi-row `INSERT` statements.

---

## 2. API & Gateway Performance (Phase 8.6)

* **HTTP Connection Reuse**: `httpClient.ts` maintains active persistent connections.
* **Gzip & Brotli Compression**: Compression enabled on all JSON responses > 1KB.
* **Throttling & Rate Bounding**: Burst requests throttled at 60 req/min for AI endpoints and 300 req/min for core REST APIs.

---

## 3. Frontend & React Rendering Optimizations (Phase 8.5 & 8.6)

* **Code Splitting & Dynamic Imports**: Every sidebar panel is dynamically imported using React `lazy()` and wrapped in `<Suspense fallback={<DashboardSkeleton />}>`.
* **State Preservation**: Dataset library is backed by `localStorage` rehydration, avoiding refetching unchanged datasets across route transitions.
* **Virtualized Data Previews**: Data table preview uses pagination and chunked rendering to prevent DOM bloat on datasets with 100,000+ rows.
* **Debounced State Persistence**: Feature history auto-saves with a 1.5s debounce to minimize network I/O.
