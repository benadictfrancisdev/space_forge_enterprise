# Sprint 2 — Enterprise Intelligence Platform (Architecture Design)

**Status:** Design only — implementation after Track 10  
**Date:** 2026-08-03  
**Track:** 8.4 (no code changes)

---

## Scope

Sprint 2 expands SpaceForge from a stabilized data workspace into a full **Enterprise Intelligence Platform**. This document defines architecture boundaries only; no implementation in Track 8.

---

## Module Map

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Agent Workspace                      │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│ Journey     │ Semantic     │ Knowledge    │ Workflow        │
│ Analytics   │ Layer        │ Graph        │ Automation      │
├─────────────┼──────────────┼──────────────┼─────────────────┤
│ Sankey /    │ Live         │ Collaboration│ Developer APIs  │
│ Flow Viz    │ Connectors   │ & Sharing    │ & Marketplace   │
└─────────────┴──────────────┴──────────────┴─────────────────┘
         │              │              │
         ▼              ▼              ▼
   Django REST    Job Engine     AI Gateway (Track 5/8)
   Datasets       Celery         FastAPI compute
```

---

## 1. Journey Analytics

**Purpose:** Funnel and path analysis across event streams tied to datasets.

| Layer | Responsibility |
|-------|----------------|
| Frontend | `JourneyAnalyticsModule` — step builder, conversion table, path viz |
| API | `POST /api/v1/analytics/journey/` → async job |
| Worker | `analytics.journey` job — SQL/pandas over dataset or warehouse connector |
| Storage | Job result JSON in S3 + summary row in PostgreSQL |

**Data contract:** `{ steps: string[], dataset_id, time_column, user_column?, filters? }`

---

## 2. Sankey / Flow Visualization

**Purpose:** Category-to-category flow diagrams (e.g. region → product → outcome).

| Layer | Responsibility |
|-------|----------------|
| Frontend | `SankeyFlowModule` — react-flow or d3-sankey wrapper |
| API | `POST /api/v1/analytics/sankey/` → job |
| AI | Optional `narrative` op for flow interpretation |

**Dependency:** Requires profiled dataset with ≥2 categorical columns.

---

## 3. Semantic Layer

**Purpose:** Business-friendly metrics and dimensions over raw datasets.

| Layer | Responsibility |
|-------|----------------|
| Models | `SemanticModel`, `Metric`, `Dimension` (org-scoped) |
| API | CRUD `/api/v1/semantic/models/` |
| Query | Metric resolver → SQL generation over dataset schema |
| Cache | Redis for compiled metric definitions |

**Rule:** Semantic layer reads from **server datasets** (Track 8.3 source of truth), not browser localStorage.

---

## 4. Knowledge Graph

**Purpose:** Entity/relationship extraction from datasets and documents.

| Layer | Responsibility |
|-------|----------------|
| Ingest | Dataset columns → entities; co-occurrence → edges |
| AI | `scientist` + custom `graph-extract` operation |
| Store | `graph_nodes`, `graph_edges` tables (org-scoped) |
| API | `/api/v1/graph/query/` — neighborhood traversal |

---

## 5. Workflow Automation

**Purpose:** Trigger → condition → action pipelines (report, notify, re-profile).

| Layer | Responsibility |
|-------|----------------|
| Engine | Extends Track 6 job types: `workflow.run`, `workflow.step` |
| Models | `Workflow`, `WorkflowRun` |
| Triggers | Schedule (Celery Beat), dataset event, manual |

---

## 6. Live Connectors (Server-Side)

**Purpose:** Replace local-first `liveConnectorsStore` with persisted connectors.

| Layer | Responsibility |
|-------|----------------|
| Models | `Connector`, `ConnectorSyncRun` |
| API | `/api/v1/connectors/` CRUD + `POST .../sync/` |
| Secrets | Vault / encrypted fields (Track 7 patterns) |

---

## 7. Collaboration & Sharing

**Purpose:** Real-time comments, shared views, dataset grants (extends `dataset.share`).

| Layer | Responsibility |
|-------|----------------|
| Models | `ShareGrant`, `Comment`, `ViewSnapshot` |
| API | WebSocket or SSE for live presence (Track 10 observability) |

---

## 8. Developer APIs & Marketplace

**Purpose:** Public API keys, webhooks, plugin registry.

| Layer | Responsibility |
|-------|----------------|
| Auth | API key scope (org-level, read/write) |
| Marketplace | `Plugin` manifest + sandboxed iframe or REST proxy |

---

## Cross-Cutting Rules (Locked)

1. UI → Django REST only (no direct FastAPI/Celery from React)
2. Heavy compute → Track 6 jobs with progress/cancel
3. AI → `/api/v1/ai/{operation}/` with Track 8.2 envelope
4. All new modules use `PlatformStates` (Track 8.5) and `httpClient` resilience (Track 8.7)

---

## Implementation Order (Sprint 2)

```
1. Server-side Live Connectors
2. Semantic Layer (metrics API)
3. Journey Analytics + Sankey (job-backed)
4. Knowledge Graph extract + query
5. Workflow Automation
6. Collaboration
7. Developer APIs / Marketplace
```

---

## Exit Criteria (Sprint 2)

- Each module has Django models, REST API, job type (if async), and Data Agent tab
- No localStorage source-of-truth for enterprise data
- Certification suites (Track 9) cover new endpoints
