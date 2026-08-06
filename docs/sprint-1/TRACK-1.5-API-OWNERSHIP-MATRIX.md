# SpaceForge Sprint 1 — API Ownership Matrix

**Status:** Locked (governance)  
**Date:** 2026-08-02  
**Depends on:** [TRACK-1.5-DOMAIN-OWNERSHIP-MAP.md](./TRACK-1.5-DOMAIN-OWNERSHIP-MAP.md)  
**Rule:** Define the REST contract before writing feature code.

---

## Purpose

Answer: **Which REST endpoint owns the feature?**

This is the contract between frontend (Platform Adapter) and backend teams. Domains are owned in Track 1.5; **routes** are owned here.

---

## Governance checks (before coding)

1. **Domain Check** — owner in Domain Ownership Map?  
2. **Pipeline Check** — fits Enterprise Data Pipeline?  
3. **API Check** — row exists in this matrix? If not, add it first.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Existing** | Live Django route today |
| **Track 2** | Wired via Platform Adapter in Track 2 |
| **Planned** | Contract reserved; implement in listed track |
| **Frozen** | No Sprint 1 work |

---

## Matrix — Data Agent & pipeline

| Sidebar / Feature | Method | Endpoint | Service | Status | Track |
|-------------------|--------|----------|---------|--------|-------|
| Health | GET | `/health/` | Django | Existing | T2.6 |
| Ready | GET | `/health/ready/` | Django | Existing | T2.6 |
| Auth exchange | POST | `/api/v1/auth/exchange/` | Django | Existing · Track 2 | T2.2 |
| Auth me | GET | `/api/v1/auth/me/` | Django | Existing · Track 2 | T2.2 |
| Organizations list/create | GET/POST | `/api/v1/organizations/` | Django | Existing · Track 2 | T2.5 |
| Organization get/patch | GET/PATCH | `/api/v1/organizations/{id}/` | Django | Existing | T2 |
| Workspaces list/create | GET/POST | `/api/v1/workspaces/` | Django | Existing · Track 2 | T2.5 |
| Workspace get | GET | `/api/v1/workspaces/{id}/` | Django | Existing | T2 |
| **Upload (storage)** | POST | `/api/v1/storage/objects/` | Django | Existing · Track 2 | **T2.5** |
| Storage list | GET | `/api/v1/storage/objects/?organization_id=` | Django | Existing · Track 2 | T2.5 |
| Storage download | GET | `/api/v1/storage/objects/{id}/download/` | Django | Planned | T4 |
| **Dataset Metadata create** | POST | `/api/v1/datasets/` | Django | Existing · Track 2 | **T2.5** |
| **Dataset list** | GET | `/api/v1/datasets/?organization_id=` | Django | Existing · Track 2 | **T2.5** |
| Dataset get/update | GET/PATCH | `/api/v1/datasets/{id}/` | Django | Existing (GET) | T4 |
| Bind storage → dataset | POST | `/api/v1/datasets/{id}/bind-storage/` | Django | Existing | T4 |
| Profiling job | POST | `/api/v1/datasets/{id}/profile/` | Django → Celery | Existing | T4 |
| Statistics | GET | `/api/v1/datasets/{id}/statistics/` | Django | Existing | T4 |
| Preview / validate | POST | `/api/v1/datasets/{id}/validate/` | Django | Planned | T4 |
| Connectors CRUD | — | `/api/v1/connectors/` | Django | Planned | T4 |
| Dashboard layouts | — | `/api/v1/dashboards/` | Django | Planned | T4 |
| Reports | — | `/api/v1/reports/` | Django | Planned | T4, T6 |
| Decisions list/persist | — | `/api/v1/decisions/` | Django | Planned | T4+ |
| Chat | POST | `/api/v1/ai/chat/` | Django → FastAPI | Existing | T5 |
| Forecast | POST | `/api/v1/ai/forecast/` | Django → FastAPI | Existing | T5 |
| AI Scientist | POST | `/api/v1/ai/scientist/` | Django → FastAPI | Existing | T5 |
| Hypothesis | POST | `/api/v1/ai/hypothesis/` | Django → FastAPI | Existing | T5 |
| NLP | POST | `/api/v1/ai/nlp/` | Django → FastAPI | Existing | T5 |
| Narrative | POST | `/api/v1/ai/narrative/` | Django → FastAPI | Existing | T5 |
| Anomaly | POST | `/api/v1/ai/anomaly/` | Django → FastAPI | Existing | T5 |
| Decision compute | POST | `/api/v1/ai/decisions/` | Django → FastAPI | Existing | T5 |
| Indian Intel | POST | `/api/v1/ai/indian-intel/` | Django → FastAPI | Existing | T5 |
| Jobs list/create | GET/POST | `/api/v1/jobs/` | Django | Existing | T6 |
| Job get | GET | `/api/v1/jobs/{id}/` | Django | Existing | T6 |
| Notifications | GET/POST | `/api/v1/notifications/` | Django | Existing | T6 |
| Audit read | GET | `/api/v1/audit/` | Django | Planned | T10 |

### Path note

Existing storage upload is **`POST /api/v1/storage/objects/`** (multipart `file` + `organization_id`), not `/storage/upload`. The matrix uses the real route.

---

## Legacy stub invokes → target endpoints

| Stub invoke | Target endpoint(s) | Track |
|-------------|-------------------|-------|
| `save-dataset` | `POST /storage/objects/` + `POST /datasets/` | T2.5 → T4 |
| `data-agent` (chat, …) | `/api/v1/ai/*` | T5 |
| `predictive-forecast` | `/api/v1/ai/forecast/` | T5 |
| `live-connectors` | `/api/v1/connectors/` | T4 |
| `share-dashboard` | `/api/v1/dashboards/` | T4 |
| `feature-history` | `/api/v1/jobs/` or history resource | Backlog |
| `razorpay-payment` | Billing API | Backlog |
| `events-*` | Frozen | Backlog |

---

## Track 2 production flow (only)

```
POST /api/v1/auth/exchange/
        │
GET/POST /api/v1/organizations/  (+ workspaces)
        │
POST /api/v1/storage/objects/     ← Upload
        │
POST /api/v1/datasets/            ← Metadata
        │
GET  /api/v1/datasets/            ← List
        │
GET  /health/                     ← Health validation
```

No `/api/v1/ai/*` in Track 2.

---

## Envelope (Track 2 adapter / Track 3 Django)

**Target (all APIs):**

```json
{
  "success": true,
  "data": {},
  "message": "",
  "errors": [],
  "meta": {}
}
```

**Today (Django):** success = raw body; errors = `{ "error": { "code", "message", "trace_id" } }`.  
**Track 2 adapter:** normalize both shapes client-side.  
**Track 3:** Django emits the unified envelope natively.

---

## Sign-off

| Artifact | Status |
|----------|--------|
| Track 1 Architecture Audit | ✅ Complete |
| Track 1.5 Domain Ownership Map | ✅ Complete |
| API Ownership Matrix | ✅ Locked |
| Track 2 Platform API Integration | 🟢 Approved to start |
