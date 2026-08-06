# SpaceForge — Session 2: Frontend ↔ Backend Integration Report

**Date:** 2026-08-06
**Scope:** Audit every page/feature and connect the React (Vite) frontend to the real
Django/DRF backend. Architecture LOCKED — no redesign, no new features.

---

## 0. Root-Cause Finding (the master blocker)

The entire frontend was running on **stub adapters** — zero real backend traffic.

- `frontend/src/platform/index.ts` chooses real Django adapters only when
  `isApiConfigured()` is true, i.e. when `VITE_API_BASE_URL` is set.
- `frontend/.env` shipped **empty**, so `useDjango === false` → every service resolved to
  `StubAuthService / StubDatabaseService / StubBackendFunctionService / StubStorageService`
  which return empty data / "backend not connected" errors.

**Fix:** populated `frontend/.env`:
```
VITE_API_BASE_URL=<preview base URL>   # /api/v1/* is ingress-routed to Django :8001
VITE_AUTH_BRIDGE=dev
```
This single change flips the whole platform onto the real REST adapters. Everything below
was already correctly written against `platformClient` / `djangoAdapter`; it just had no
base URL to talk to.

---

## 1. Runtime wiring (how it runs in this pod)

Supervisor entrypoints are read-only (`uvicorn server:app` on :8001, `yarn start` on :3000),
so the stack was adapted to them (ports unchanged):

| Layer | Adaptation |
|---|---|
| Backend | `backend/server.py` ASGI shim → `config.asgi:application`, `DJANGO_SETTINGS_MODULE=config.settings.lite` (SQLite + locmem + in-memory storage, eager Celery, inline AI). `backend/.env` added. |
| Frontend | `package.json` `start` script → `vite --host 0.0.0.0 --port 3000`; `vite.config.ts` `allowedHosts: true` + port 3000. |
| Ingress | `/api/v1/*` and `/api/*` → :8001 (Django); everything else → :3000 (Vite). |

Migrations + `seed_platform` applied. Dev auth: `POST /api/v1/auth/exchange {"token":"dev:<uid>:<email>"}`.

---

## 2. Feature → Component → Hook → Adapter → REST → Result

Legend: ✅ live & validated · ⚠️ works but note · ⛔ disconnected (blocker)

| # | Feature | Frontend entry | Adapter call | REST endpoint | Status |
|---|---------|----------------|--------------|---------------|--------|
| 1 | **Upload** | `pages/DataAgent.tsx`, `PlatformDatasetPicker` | `djangoApi.uploadAndRegisterDataset` / `save-dataset` | `POST /api/v1/storage/objects/`, `POST /api/v1/datasets/`, `POST /datasets/{id}/profile/` | ✅ |
| 2 | **Connectors** | `db-connect`, `fetch-connector-data`, `live-connectors`, `connections` UI | `djangoDbConnect`, `djangoFetchConnector`, `djangoConnectors`, `djangoApi.*Connection*` | `/api/v1/connections/…`, `/api/v1/connectors/test/` | ✅ |
| 3 | **Dashboard** | `pages/Dashboards.tsx`, `AnalyticsHub` | `platform.ai` / `analysisAPI` → `data-agent` | `POST /api/v1/ai/*` | ✅ |
| 4 | **Executive** | `pages/apps/ExecutiveInsights.tsx` | `platformClient.prepareDataset / getInsightBundle / scheduleExecutiveBrief` | `/api/v1/applications/executive/{prepare,bundle,schedule-brief}/` | ✅ (pipeline job → *succeeded*) |
| 5 | **Journey** | `pages/apps/JourneyAnalytics.tsx` | `platformClient.listJourneys / seedJourneyTemplates / createJourney / analyzeJourney / explainJourney` | `/api/v1/applications/journeys/…` | ✅ |
| 6 | **Decision** | `pages/apps/DecisionIntelligenceApp.tsx` | `platformClient.analyzeDecision / getDecisionCase` | `/api/v1/applications/decisions/…` | ✅ |
| 7 | **Forecast** | `pages/apps/ForecastStudioApp.tsx` | `platformClient.forecastScenarios` | `POST /api/v1/applications/forecast/scenarios/` | ✅ |
| 8 | **AI Scientist** | `pages/apps/AIScientistApp.tsx` | `platformClient.getScientistContext` | `GET /api/v1/applications/scientist/context/` | ✅ |
| 9 | **Reports** | `pages/apps/EnterpriseReportingApp.tsx` | `platformClient.listReportTypes / generateReport / scheduleReport / downloadReportMarkdown` | `/api/v1/applications/reporting/…` | ✅ |
| 10 | **Operational** | `pages/apps/OperationalIntelligenceApp.tsx` | `platformClient.getOpsDashboard` | `GET /api/v1/applications/operations/` | ✅ |
| 11 | **Governance** | surfaced in Executive/Ops panels (`InsightPanels`, `OpsDashboardView`) | via operations/executive bundle | `/api/v1/applications/operations/` (+`/api/v1/governance/*` REST exists) | ⚠️ governance REST requires `organization_id` query param; frontend consumes governance via ops/executive bundle (works) |
| 12 | **Settings** | account/theme (client) + `EventSettings` (event engine) | n/a for account; event settings → events fns | — | ⚠️ account settings are client-side; event settings depend on #Event Engine below |
| 13 | **Notifications** | `AppShell` bell (event shell) | REST list available | `GET /api/v1/notifications/` | ⚠️ endpoint live & returns []; the header bell in the Event shell is decorative (no handler) |
| 14 | **History** | `useFeatureHistory`, `FeatureHistoryPanel` | `feature-history` → `lib/featureHistoryStore` | — (localStorage) | ⚠️ intentional local-first (documented "until Sprint 2"); not backend-backed |
| 15 | **Search** | `components/enterprise/EnterpriseGlobalSearch.tsx` | `platformClient.enterpriseSearch` | `GET /api/v1/enterprise-services/search/` | ✅ (returns [] until data seeded) |

### AI gateway mapping (used by Dashboard / DataAgent / SpaceBot)
`services/api.ts` → `backend.functions.invoke("data-agent"|"predictive-forecast"|"indian-business-intel"|"spacebot")`
→ `djangoAI.invokeLegacyAIFunction` → `aiFallbacks.invokeAIWithFallback` → `POST /api/v1/ai/{operation}/`.
Operations available (from `/api/v1/ai/health/`): anomaly, chat, decisions, forecast, hypothesis, indian-intel, narrative, nlp, scientist.
Privacy pipeline (PII scan → tokenize → summarize) runs client-side **by design** before any AI call.

---

## 3. Validation results (live, through public ingress, dev auth)

All requests carry `Authorization: Bearer <jwt>`, `X-Organization-ID`, `X-Workspace-ID`.

| Check | Result |
|---|---|
| `POST /api/v1/auth/exchange/` (dev token) | 200 — JWT + user row created |
| `POST /api/v1/organizations/`, `/workspaces/` | 200 — persisted (DB) |
| `POST /api/v1/storage/objects/` (CSV upload) | 200 — storage object |
| `POST /api/v1/datasets/` + `/{id}/profile/` | 200 — dataset registered & profiled |
| `POST /api/v1/applications/executive/prepare/` → poll job | job **succeeded** |
| `GET  /api/v1/applications/executive/bundle/` | 200 — insight bundle |
| `POST /api/v1/applications/decisions/` | 200 — reasoning chain |
| `POST /api/v1/applications/forecast/scenarios/` | 200 — expected/best/worst |
| `POST /api/v1/applications/reporting/generate/` | 200 — report sections |
| `GET  /api/v1/applications/scientist/context/` | 200 — semantic context |
| `GET  /api/v1/applications/operations/` | 200 — job/quality/governance health |
| `GET  /api/v1/enterprise-services/search/` | 200 |
| `GET  /api/v1/notifications/`, `/jobs/`, `/connections/`, `/datasets/` | 200 |
| `GET  /api/v1/ai/health/` + `POST /api/v1/ai/chat/` | 200 |
| Firebase email/password signup (identitytoolkit) | 200 (auth viable from preview) |

---

## 4. Remaining blockers / notes

1. ⛔ **Event Engine** (`/app/events/*` pages, `features/events/api/eventsApi.ts`) calls
   `backend.functions.invoke("events-stats" | "events-query" | "events-ingest")`. These names
   are **not routed** in `platform/index.ts`, so they fall through to `StubBackendFunctionService`
   (dead), and `apps.events` exposes **no REST urls** in `apps/api/urls.py`. Wiring it requires
   building backend endpoints → deferred (out of "no new features" scope; not part of the 15 core apps).
2. ⚠️ **Event shell chrome** (`AppShell.tsx`): notification bell has no handler; the ⌘K palette is
   a static placeholder ("Global search will be available once events are ingested").
3. ⚠️ **`sync-profile`** invoked from `useAuth` is unrouted → resolves via stub (fire-and-forget, harmless).
4. ⚠️ **History** (`feature-history`) is localStorage-backed by design, not the backend.
5. ⚠️ **Google sign-in** needs the preview domain added to Firebase Authorized Domains; **email/password works**.
6. ⚠️ **`/health/`** (used by `djangoApi.health`) has no `/api` prefix, so it is ingress-routed to the
   frontend, not Django. Non-blocking (health widget only); all feature traffic uses `/api/v1/*`.

## 5. Files modified / added
- `frontend/.env` (added `VITE_API_BASE_URL`, `VITE_AUTH_BRIDGE`) — **the master fix**
- `frontend/vite.config.ts` (port 3000, `allowedHosts`)
- `frontend/package.json` (`start` script)
- `backend/server.py` (ASGI shim — new)
- `backend/.env` (lite runtime config — new)

No application/business logic or component code was changed — the platform layer was already
correct; it was disconnected purely by missing configuration.
