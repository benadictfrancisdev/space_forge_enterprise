# Track 12 Phase 12.8 — Query & Compute Platform

**Status:** ✅ Complete  
**Wave:** 3 — Trusted AI

---

## Delivered

- SQL Generator (natural language → read-only SQL)
- Query Planner (`plan_steps` on `QueryPlan`)
- Query Optimizer (`optimize_sql` — LIMIT enforcement)
- Execution Engine (DuckDB in-memory, Python fallback)
- Compute Scheduler (Celery jobs via `query_compute.execute`)
- Worker Pool registry (`ComputeWorkerPool` metadata)

Applications never execute SQL directly — all via Query & Compute API.

---

## API

```text
POST /api/v1/query-compute/datasets/{id}/generate-sql/
POST /api/v1/query-compute/datasets/{id}/execute/
GET  /api/v1/query-compute/datasets/{id}/executions|plans/
GET  /api/v1/query-compute/worker-pools/
```

Job: `query_compute.execute`

---

## Security

Only `SELECT` queries allowed — `DROP/DELETE/UPDATE/INSERT` blocked.
