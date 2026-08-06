# SpaceForge Sprint 1 — Track 1.5: Domain Ownership Map

**Status:** Locked (closes Track 1)  
**Date:** 2026-08-02  
**Scope:** Design only — no implementation  
**Depends on:** [TRACK-1-ARCHITECTURE-AUDIT.md](./TRACK-1-ARCHITECTURE-AUDIT.md)

---

## Purpose

Answer: **Which runtime owns each responsibility?**

Without this map, Track 2 adapters and later FastAPI/Celery work create unclear boundaries. Every engineer uses this table before placing code.

---

## Runtime roles (locked)

| Runtime | Owns | Does **not** own |
|---------|------|------------------|
| **React (Frontend)** | Presentation, UX state, client preview helpers | System of record, AI compute, durable jobs |
| **Platform REST Adapter** | HTTP to Django, auth headers, envelope unwrap, retries | Business rules, SQL, model inference |
| **Django** | Domain API, tenancy, orchestration, metadata, sync CRUD | Heavy AI inference, long CPU jobs (delegates) |
| **PostgreSQL** | Transactional system of record | Files, queues, embeddings blobs (prefer S3/Redis) |
| **Redis** | Broker, cache, rate limit, ephemeral AI session state | Durable domain entities |
| **S3 / MinIO** | Binary objects (uploads, PDFs, artifacts) | Relational metadata |
| **Celery** | Async workers: profile, stats, report render, AI job bridge | HTTP API surface, UI |
| **FastAPI** | AI **compute only** (stateless request/response) | Auth source of truth, org CRUD, dataset registry |

**Rule:** The UI never talks to FastAPI or Celery directly. Path is always:

```
React → Platform Adapter → Django → (Postgres | Redis | S3 | Celery → FastAPI)
```

---

## Domain ownership table

| Domain | Primary owner | Persistence | Invoked by | Sprint track |
|--------|---------------|-------------|------------|--------------|
| Authentication (identity verify + JWT issue) | **Django** | PostgreSQL (`identity_users`) | Platform adapter | T2, T7 |
| Session / access token attach | **Platform Adapter** | Browser (memory) + Django JWT | React | T2 |
| Organizations | **Django** | PostgreSQL | Platform adapter | T2 |
| Workspaces | **Django** | PostgreSQL | Platform adapter | T2 |
| Memberships / RBAC | **Django** | PostgreSQL | Django services | T7 |
| Permissions catalog | **Django** | PostgreSQL (seeded) | Django services | T7 |
| Dataset Registry | **Django** | PostgreSQL (`datasets`) | Platform adapter | T2, T4 |
| Dataset Metadata (schema, row_count, version) | **Django** | PostgreSQL | Django + Celery profile job | T4 |
| Storage (object metadata) | **Django** | PostgreSQL (`storage_objects`) | Platform adapter | T2, T4 |
| Uploaded files (bytes) | **S3 / MinIO** (via Django) | Object store | Django StorageService | T4 |
| Upload validation / cleaning orchestration | **Django** | — | API / pipeline | T4 |
| Profiling | **Celery** | Writes results → PostgreSQL | Django enqueues job | T4, T6 |
| Statistics (server) | **Celery** | Profile/stats JSON → PostgreSQL | Django enqueues job | T4, T6 |
| Statistics preview (optional UX) | **React** (local engines) | Ephemeral UI only | User | T4 (non-SoT) |
| Connectors (credentials + sync config) | **Django** | PostgreSQL (+ secrets policy) | Platform adapter | T4 (thin) |
| Connector sync workers | **Celery** | Staging → Dataset pipeline | Django | T6 |
| Dashboard layouts | **Django** | PostgreSQL | Platform adapter | T4 |
| Dashboard render (charts) | **React** | — (reads Dataset APIs) | User | T4 |
| Reports (metadata + status) | **Django** | PostgreSQL | Platform adapter | T4, T6 |
| Report generation (PDF/narrative job) | **Celery** | Artifact → S3; meta → Postgres | Django | T6 |
| Report AI narrative text | **FastAPI** | None (returns payload) | Celery via Django | T5, T6 |
| Decision Feed (compute) | **FastAPI** | None | Django/Celery | T5 |
| Decision Feed (persist/list) | **Django** | PostgreSQL | Platform adapter | T4+ |
| AI Chat | **FastAPI** | Redis ephemeral turn state only | Django proxy | T5 |
| Forecast | **FastAPI** | Optional result cache → Redis | Django/Celery | T5 |
| AI Scientist / Hypothesis / NLP | **FastAPI** | None (compute) | Django/Celery | T5 |
| Narrative / Anomaly / IBI modules | **FastAPI** | None (compute) | Django/Celery | T5 |
| Embeddings (if used) | **FastAPI** | Vectors later; Sprint 1: compute or skip | Django | T5 |
| Jobs (status API) | **Django** | PostgreSQL (`jobs`) | Platform adapter | T6 |
| Job execution | **Celery** | Updates `jobs` | Django enqueue | T6 |
| Notifications (in-app) | **Django** | PostgreSQL | Django/Celery | T6 |
| Audit Logs (write) | **Django** | PostgreSQL | Domain services | T7, T10 |
| Audit Logs (read API) | **Django** | PostgreSQL | Platform adapter | T10 |
| Outbox / domain events | **Django** write · **Celery** drain | PostgreSQL | Services / beat | T6 |
| Billing | **Django** (foundation) | PostgreSQL | — | Backlog |
| API response envelope | **Django** emit · **Adapter** unwrap | — | All APIs | T3 (prep in T2) |
| Rate limiting | **Redis** (+ Django middleware) | Redis | API gateway path | T7, T10 |
| Health / ready | **Django** (+ worker heartbeat in Redis) | Redis key | Ops | T8, T10 |
| Monitoring / metrics export | **Django** / infra | — | Ops | T10 |

---

## Pipeline stage → owner

Maps Artifact 3 (Enterprise Data Pipeline) to runtimes:

| Stage | Owner | Notes |
|-------|-------|-------|
| Upload | Django → S3 | Adapter calls Django storage/dataset APIs |
| Validation | Django | May use lightweight sync checks; heavy = Celery |
| Cleaning | Django / Celery | Sync for small files; async for large |
| Metadata | Django → PostgreSQL | Dataset Registry |
| Store file | S3 via Django | Never FastAPI |
| Profiling | Celery | Result written to Dataset metadata |
| Statistics | Celery | Same job family as profiling |
| Analytics consumers | React + Django reads | No private SoT in localStorage |
| AI compute | FastAPI | Input: Dataset ID + privacy-safe summary/payload from Django |
| Decision Feed | FastAPI compute → Django persist | |
| Reports | FastAPI (text) + Celery (render) + Django (meta) + S3 (file) | |
| Dashboard persist | Django | Layouts reference Dataset IDs |

---

## Boundary rules (non-negotiable)

1. **FastAPI never owns orgs, users, datasets, or files.** It receives a job/request payload from Django/Celery and returns compute results.
2. **Celery never exposes HTTP.** Only Django (or internal task signatures) enqueue work.
3. **PostgreSQL never stores large raw CSV/XLSX blobs.** Bytes go to S3; Postgres holds metadata and profiles.
4. **React never calls FastAPI or Redis.** Only the Platform Adapter → Django.
5. **Client `statisticsEngine` / `datasetLibrary`** may preview; they are **not** system of record after Track 4.
6. **New features** must name a row in this table before implementation. If no owner fits, update this doc first.

---

## Anti-patterns (reject in review)

| Anti-pattern | Why rejected |
|--------------|--------------|
| React → FastAPI directly | Breaks auth/tenancy; duplicates gateway |
| FastAPI writes Dataset rows | Splits registry ownership |
| Celery serves REST | Two API surfaces |
| Storing uploads only in Postgres | Breaks scale; fights S3 design |
| Putting org CRUD in FastAPI | FastAPI is compute-only |
| Feature component custom `fetch` | Bypasses adapter, envelope, auth |

---

## Track 2 readiness

With this map locked, Track 2 **Platform API Integration** may begin:

| Phase | Scope | Touches owners |
|-------|--------|----------------|
| 2.1 | `DjangoAdapter` replacing stubs for wired contracts | Adapter → Django |
| 2.2 | Auth middleware (JWT, org, workspace headers) | Adapter + Django Auth |
| 2.3 | Response adapter (unwrap / normalize envelope) | Adapter (Django emits fully in T3) |
| 2.4 | Central error handler | Adapter only |
| 2.5 | First production flow: Upload → Metadata → Storage → List | Django Dataset + Storage |
| 2.6 | Health validation end-to-end | Django `/health` |

**Explicitly not Track 2:** FastAPI, AI chat/forecast, Decision Engine, Celery profile workers (those are T4–T6).

---

## Sign-off

| Item | Status |
|------|--------|
| Track 1 Architecture Audit | ✅ Closed |
| Track 1.5 Domain Ownership Map | ✅ Locked |
| API Ownership Matrix | ✅ [TRACK-1.5-API-OWNERSHIP-MATRIX.md](./TRACK-1.5-API-OWNERSHIP-MATRIX.md) |
| Track 2 Platform API Integration | 🟢 In progress / see TRACK-2 doc |

**Next after Track 2 validation:** `Start Track 3 — Response Standardization`
