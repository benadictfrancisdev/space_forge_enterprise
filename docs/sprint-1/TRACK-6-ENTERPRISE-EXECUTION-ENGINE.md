# SpaceForge Sprint 1 — Track 6: Enterprise Execution Engine

**Status:** ✅ Complete  
**Date:** 2026-08-02  
**Roadmap:** [REVISED-ENTERPRISE-ROADMAP.md](./REVISED-ENTERPRISE-ROADMAP.md)

## Role (locked)

Not “Celery wiring” — every long-running operation is a **job** with enterprise controls:

```
Upload → Profile → Statistics → Forecast → Narrative → Decisions → Report → Notifications
```

UI never talks to Celery. Clients use Django `/api/v1/jobs/*` via `platform.api`.

---

## Job contract

| Field | Purpose |
|-------|---------|
| `id` | Job ID |
| `status` | queued · running · succeeded · failed · cancelled |
| `progress_pct` | 0–100 |
| `priority` | 1 low · 5 normal · 10 high |
| `attempt_count` / `max_retries` | Retry budget |
| `timeout_seconds` | Soft time limit (Celery) |
| `cancel_requested` | Cooperative cancel |
| `error` | Failure / cancel reason |
| `execution_ms` | Wall time when finished |
| `status_message` | Stage hint (`running:forecast`, …) |

---

## Job types

| Type | Behavior |
|------|----------|
| `platform.ping` | Certification echo |
| `dataset.profile` | Profile tabular dataset (Track 4) |
| `dataset.pipeline` | Profile → Forecast → Narrative → Decisions → Report |
| `ai.compute` | Async AI via gateway (`operation` in payload) |

---

## APIs

```
POST   /api/v1/jobs/                 enqueue (priority, timeout, max_retries)
GET    /api/v1/jobs/?organization_id=
GET    /api/v1/jobs/{id}/
POST   /api/v1/jobs/{id}/cancel/
POST   /api/v1/jobs/{id}/retry/
```

Frontend helpers: `platform.api.enqueueJob` · `getJob` · `listJobs` · `cancelJob` · `retryJob` · `enqueueDatasetPipeline`.

---

## Implementation map

| Layer | Location |
|-------|----------|
| Model | `backend/apps/jobs/infrastructure/models.py` |
| Service | `backend/apps/jobs/application/services.py` |
| Pipeline | `backend/apps/jobs/application/pipeline.py` |
| API | `backend/apps/jobs/api/views.py` |
| Worker | `backend/workers/tasks.py` → `workers.execute_platform_job` |

---

## Validation

```bash
cd backend && .venv\Scripts\python.exe -m pytest tests/test_jobs_notifications.py -q
npm run validate:track6   # requires backend lite on :8000
```

---

## Next

- **Track 7** — Enterprise Security Certification (pilot gate)  
- Then Track 8 → 9 → 10 → Enterprise Frontend Modernization
