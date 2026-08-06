# SpaceForge Sprint 1 — Track 1: Enterprise Architecture Audit

**Status:** ✅ Closed  
**Date:** 2026-08-02  
**Scope:** As-built inventory only — no Tracks 2–10 implementation  
**Baseline:** Official Sprint 1 architecture (Postgres · Redis · S3/MinIO · Django · Celery · FastAPI AI compute)  
**Follow-on:** [TRACK-1.5-DOMAIN-OWNERSHIP-MAP.md](./TRACK-1.5-DOMAIN-OWNERSHIP-MAP.md) (required before Track 2)

---

## Locked architecture (Sprint 1)

```
                    React Frontend
                           │
                           ▼
               Platform API Contracts
                           │
                    REST Adapters
                           │
                           ▼
                    Django REST API
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
     PostgreSQL     Redis        S3 / MinIO
          │
          ▼
      Celery Workers
          │
          ▼
     FastAPI AI Service   ← compute only
          │
          ▼
 Enterprise Intelligence Engine
```

**Out of scope:** MongoDB, new sidebar modules, marketplace, extra AI agents, database migration.

**Stub rule:** `stubs.ts` → REST adapter → real API → delete stub (only when endpoint is production-ready).

---

# Artifact 1 — Layer Audit

Each layer: **Current State → Target State → Gap → Sprint Owner**

## 1.1 Frontend (React)

| | |
|---|---|
| **Current** | Vite + React 18 + TS. Routes in `src/App.tsx`. Data Agent = 26 sidebar tabs (`src/pages/DataAgent.tsx`). Platform façade `src/platform/` → **all stubs**. Client engines in `src/lib/` power upload/stats/charts. Firebase Auth is the only live cloud call. |
| **Target** | UI talks only to Platform Contracts. REST adapters call Django (domain) and FastAPI (AI via Django or direct compute gateway). No direct `fetch` from feature components. localStorage not source of truth for datasets. |
| **Gap** | No REST adapters; `VITE_API_BASE_URL` unused by platform; ~20 orphan panels; marketing ArchitectureSection overstates “live”. |
| **Owner** | Track **2** (adapters), **4** (pipeline consumers), freeze orphans |

## 1.2 Platform API Client

| | |
|---|---|
| **Current** | Contracts in `src/platform/contracts.ts`; wired to `stubs.ts` in `src/platform/index.ts`. Invokes via `edgeFunctions.ts` / `services/api.ts`. |
| **Target** | Same contracts → REST adapters (fetch-based; no Axios required). Interceptors: auth token, retry, logging, envelope unwrap. UI unaware of Django vs FastAPI. |
| **Gap** | Zero production adapters; stub returns `Enterprise backend pending`. |
| **Owner** | Track **2** |

## 1.3 Django REST API

| | |
|---|---|
| **Current** | Phase 0.1 modular monolith. `/api/v1`: auth, orgs, workspaces, storage upload/list, dataset metadata create/list, jobs, notifications. Errors: `{error:{code,message,trace_id}}`. Success = raw DRF JSON. |
| **Target** | Unified envelope; full tenancy; dataset pipeline APIs; job types for profile/AI/report; Django orchestrates FastAPI AI. |
| **Gap** | No success envelope; no pipeline; no report/analytics domains; memberships/audit/billing have no REST. |
| **Owner** | Tracks **2**, **3**, **4**, **7** |

## 1.4 Authentication

| | |
|---|---|
| **Current** | Frontend: Firebase. Backend: `AUTH_MODE=dev` or Firebase JWKS → SpaceForge JWT via `/api/v1/auth/exchange/`. Tenant headers optional. |
| **Target** | Firebase → exchange → JWT on every API call; org/workspace scoping enforced; refresh/revoke policy. |
| **Gap** | Frontend never exchanges with Django; tenancy soft; no refresh flow in UI. |
| **Owner** | Track **7** (+ **2** for client wiring) |

## 1.5 Organizations / Workspaces / Permissions

| | |
|---|---|
| **Current** | Models + RBAC seed + org/workspace APIs. Membership created for org owner only. No membership management API. |
| **Target** | Stable multi-tenant platform for pilot orgs. |
| **Gap** | Frontend not wired; invite/list members missing. |
| **Owner** | Track **2** (wire), **7** (harden) |

## 1.6 Datasets + Storage (Data Engine core)

| | |
|---|---|
| **Current** | `StorageObject` upload API + `Dataset` metadata create/list. FK `storage_object` unused by API. Profiling/stats happen in browser (`statisticsEngine`, `datasetLibrary` localStorage). |
| **Target** | Upload → validation → cleaning → metadata → profiling → statistics → store (S3 + Postgres) → feed analytics/AI/reports/dashboards. |
| **Gap** | No orchestrated pipeline; no profile job; no download/signed-url HTTP; client is source of truth. |
| **Owner** | Track **4** |

## 1.7 Redis / Celery (Jobs)

| | |
|---|---|
| **Current** | Redis cache + Celery broker. Tasks: echo job payload, log outbox, heartbeat, ping. |
| **Target** | Jobs for profiling, AI compute, report generation; progress/cancel; outbox to real consumers. |
| **Gap** | Echo-only executor; outbox log-drain only. |
| **Owner** | Track **6** (consumes Track **5**) |

## 1.8 FastAPI AI Service

| | |
|---|---|
| **Current** | **Does not exist.** AI UI calls stubbed function names (`data-agent`, `predictive-forecast`, etc.). |
| **Target** | AI compute layer only: chat, forecast, narrative, decision, embeddings, etc. Invoked by Django/Celery — not a second product backend. |
| **Gap** | Entire service + contract + container. |
| **Owner** | Track **5** |

## 1.9 Reports / Dashboards / Decision Feed

| | |
|---|---|
| **Current** | Client charts/PDF (`jspdf`, recharts). Report AI content stubbed. `/decisions` uses local `decisionGenerator`. Dashboards persist via stub `share-dashboard`. |
| **Target** | Reports metadata in Postgres; files in S3; AI narratives via FastAPI; dashboards load server datasets; decisions from pipeline outputs. |
| **Gap** | No report Django domain; no server decision store. |
| **Owner** | Track **4** (data), **5** (AI narrative/decision), **6** (async reports) |

## 1.10 Infrastructure (Docker)

| | |
|---|---|
| **Current** | `backend/docker-compose.yml`: postgres, redis, minio, api, worker, beat. Lite mode: SQLite without Docker (`config.settings.lite`). |
| **Target** | Full compose including FastAPI AI; frontend env pointed at API; one-command local stack. |
| **Gap** | No AI service container; frontend not integrated; Windows Docker Desktop dependency. |
| **Owner** | Track **8** |

## 1.11 Testing & Observability

| | |
|---|---|
| **Current** | Backend: 8 pytest modules (auth, orgs, tenancy, datasets, jobs, health, certification). Frontend: no automated E2E suite in repo. Logs + trace ID + `/health`/`/ready`; in-process metrics hooks. |
| **Target** | Critical workflow tests; exported metrics/alerting for pilot. |
| **Gap** | No pipeline/AI tests; metrics not exported. |
| **Owner** | Tracks **9**, **10** |

## 1.12 API Response Envelope

| | |
|---|---|
| **Current** | Errors structured; success bodies vary. Frontend has `outputEnvelope.ts` types unused by Django. |
| **Target** | All APIs: `{ success, data, message, errors, meta }`. |
| **Gap** | Django does not emit envelope; adapters cannot unwrap consistently. |
| **Owner** | Track **3** |

---

# Artifact 2 — Sidebar & Feature Classification

**Status legend**

| Status | Meaning |
|--------|---------|
| Real | Works end-to-end on client without stub (local engines) |
| Local | Client-only math/viz; no server persistence |
| Partial | Mix of local + stubbed remote |
| Stub | Requires platform invoke; currently fails/empty |
| Orphan | Built but not in primary Data Agent nav — **Freeze** |

**Backend (Sprint 1 target)** = where the feature should land, not what exists today.

## 2.1 Data Agent sidebar (26 tabs)

| Feature | Status | Pipeline | Backend (S1) | Priority |
|---------|--------|----------|--------------|----------|
| Upload | Partial | Data Engine | Django | Sprint |
| Live Connectors | Stub | Data Engine | Django | Sprint (thin) / Backlog deep |
| Preview | Partial | Data Engine | Django | Sprint |
| Statistics | Partial | Data Engine | Django (+ FastAPI insights later) | Sprint |
| Chat with Data | Stub | AI | FastAPI | Sprint |
| Predict | Stub | AI | FastAPI | Sprint |
| AI Scientist | Stub | AI | FastAPI | Sprint |
| Hypothesis | Stub | AI | FastAPI | Sprint |
| NLP Engine | Stub | AI | FastAPI | Sprint |
| Full Narrative | Stub | AI + Report | FastAPI | Sprint |
| Anomaly Watch | Stub | AI | FastAPI | Sprint |
| Decisions (tab) | Stub | Decision Engine | FastAPI | Sprint |
| Forecast (chat) | Stub | AI | FastAPI | Sprint |
| Churn Predictor | Stub | AI | FastAPI | Sprint |
| Inventory Optimizer | Stub | AI | FastAPI | Sprint |
| Revenue Drop | Stub | AI | FastAPI | Sprint |
| Segmentation (IBI) | Stub | AI | FastAPI | Sprint |
| Sales Performance | Stub | AI | FastAPI | Sprint |
| Dashboard | Local | Dashboard Engine | Django | Sprint |
| Power BI | Partial | Dashboard + AI | Django + FastAPI | Sprint |
| KPI Cards | Local | Dashboard Engine | Django | Sprint |
| Charts | Partial | Dashboard + Report | Django + FastAPI | Sprint |
| Stakeholder Report | Stub | Report Engine | Django + FastAPI | Sprint |
| Full Report | Stub | Report Engine | Django + FastAPI | Sprint |
| History | Partial | Freeze | Django | Backlog |
| System Status | Stub | Freeze | Django | Backlog |

## 2.2 Adjacent product surfaces

| Feature | Status | Pipeline | Backend (S1) | Priority |
|---------|--------|----------|--------------|----------|
| Analytics Hub (`/analytics`) | Stub/Partial | Data + AI | Django + FastAPI | Sprint (reuse pipeline) |
| Decision Feed (`/decisions`) | Local | Decision Engine | FastAPI | Sprint |
| Dashboards page (`/dashboards`) | Partial | Dashboard Engine | Django | Sprint |
| Event Engine (`/app/events`) | Stub | Freeze | — | Backlog |
| Billing / Razorpay | Stub | Freeze | Django | Backlog |
| SpaceBot | Stub | Freeze | FastAPI | Backlog |
| Sharing / Leaderboard | Stub | Freeze | Django | Backlog |

## 2.3 Orphans — Freeze (no Sprint 1 product work)

WorkflowBuilder · WorkflowOrchestrator · SQLForge · SQLQueryBuilder · DatabaseConnector · MLWorkbench (+ ml/*) · ReportForge · ForgeAutopilot · ADAAgentManager · InsightInbox · SmartImputation · SegmentDiscoveryAgent · RootCauseAgent · CausalDiscoveryAgent · CalendarTableGenerator · CohortAnalysisPanel · ABTestingPanel · DataAnalyticsTestingPanel · AutoMLForecasting · AutoExperimentEngine · AutoReportEngine · AutoDashboard · ScheduledReportsPanel · AICostMonitor · MemoryContextPanel · AutonomousPipeline (dead import) · UnifiedResultsView (dead import) · scientist/* panels · founder/* panels (not in nav)

## 2.4 Named platform invokes (all stubbed today)

`data-agent` · `predictive-forecast` · `live-connectors` · `save-dataset` · `indian-business-intel` · `share-dashboard` · `feature-history` · `razorpay-payment` · `spacebot` · `db-connect` · `fetch-connector-data` · `scheduled-sync` · `ada-agent-run` · `send-whatsapp-insight` · `events-stats` · `events-query` · `events-ingest`

Replace per stub rule via Tracks **2** + **5** (AI names) and **4** (`save-dataset` / connectors).

## 2.5 Client engines to absorb into Enterprise Data Pipeline

| Engine | Path | Sprint 1 fate |
|--------|------|---------------|
| `streamingParser` / `schemaNormalizer` / `pdfParser` | `src/lib/` | Keep client parse UX; persist via Django pipeline |
| `datasetLibrary` | localStorage | Replace as source of truth → Django datasets |
| `statisticsEngine` / `advancedStats` / `statisticalSummarizer` | `src/lib/` | Move profiling to server job; optional client preview |
| `piiScanner` / `dataTokenizer` | `src/lib/` | Keep client privacy gate; server re-validate |
| `decisionGenerator` | `src/lib/` | Replace with FastAPI Decision Engine outputs |
| `formulaEngine` / `joinEngine` | `src/lib/` | Dashboard Engine (Django) later |
| `outputEnvelope` | `src/lib/` | Align with Track **3** Django envelope |

---

# Artifact 3 — Enterprise Data Pipeline Dependency Map

This is the **single spine** every Sprint 1 feature must consume. No sidebar module invents its own upload→analyze path.

```
 Upload (file / connector)
        │
        ▼
   Validation ─────────── PII scan / schema check
        │
        ▼
   Cleaning ───────────── normalize types, nulls, aliases
        │
        ▼
   Metadata ───────────── Dataset row in PostgreSQL
        │
        ▼
   Store file ─────────── S3 / MinIO (StorageObject)
        │
        ▼
   Profiling job ──────── Celery → row_count, schema, quality
        │
        ▼
   Statistics ─────────── server profile (+ optional client preview)
        │
        ▼
   Analytics consumers ── KPI · Charts · Dashboard · Power BI tiles
        │
        ▼
   AI compute ─────────── FastAPI (chat, forecast, narrative, IBI, …)
        │
        ▼
   Decision Feed ──────── prioritized actions from AI + stats
        │
        ▼
   Reports ────────────── PDF/narrative artifacts → S3 + metadata
        │
        ▼
   Dashboard persist ──── layouts bound to Dataset IDs (not local blobs)
```

### Dependency rules

1. **Upload** is the only entry for raw data (connectors write into the same Validation step).
2. **Statistics / Preview / KPI / Charts / Dashboard** read **profiled Dataset**, never a private in-memory copy as system of record.
3. **All AI tabs** receive Dataset ID + profile summary (and privacy-safe payload), not ad-hoc CSV dumps with divergent schemas.
4. **Decision Feed** and **Reports** depend on Statistics + AI outputs — they do not re-parse uploads.
5. **Orphans** stay frozen until they are rewritten as pipeline consumers (post–Sprint 1).

### Track mapping onto the pipeline

| Pipeline stage | Owner track |
|----------------|-------------|
| Platform client + auth headers | 2, 7 |
| Response envelope | 3 |
| Upload → Validate → Clean → Metadata → Store → Profile → Statistics | 4 |
| AI compute stages | 5 |
| Async profile / AI / report jobs | 6 |
| Compose + MinIO/Postgres/Redis/AI container | 8 |
| Tests for pipeline critical path | 9 |
| Health, logs, metrics for pipeline | 10 |

---

## Sprint 1 track order (confirmed)

| # | Track | Depends on |
|---|--------|------------|
| 1 | Architecture Audit | — **(this document)** ✅ Closed |
| 1.5 | Domain Ownership Map | Track 1 → [TRACK-1.5](./TRACK-1.5-DOMAIN-OWNERSHIP-MAP.md) ✅ Locked |
| 2 | Platform API Integration | Tracks 1 + 1.5 |
| 3 | Response Standardization | Track 2 started |
| 4 | Unified Dataset Pipeline | Tracks 2–3 |
| 5 | FastAPI AI Service | Track 4 (dataset IDs) |
| 6 | Background Jobs | Tracks 4–5 |
| 7 | Authentication Hardening | Track 2 |
| 8 | Docker Infrastructure | Tracks 5–6 |
| 9 | Testing | Tracks 4–7 |
| 10 | Monitoring & Production | Track 8+ |

---

## Review checklist (Track 1 exit)

- [x] Architecture baseline accepted (Postgres stack, FastAPI = compute only)
- [x] Sidebar classification accepted (Sprint vs Freeze)
- [x] Enterprise Data Pipeline dependency map accepted
- [x] Domain Ownership Map (Track 1.5) locked
- [x] No Track 2 coding until ownership map exists

**Next:** `Start Track 2 — Platform API Integration`
