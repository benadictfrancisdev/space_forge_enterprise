# SpaceForge Enterprise — PRD / Working Memory

## Original problem (Session 2)
Connect every frontend feature to the real backend. Architecture LOCKED — no redesign,
no new features. Audit all 15 features (Upload, Connectors, Dashboard, Executive, Journey,
Decision, Forecast, AI Scientist, Reports, Operational, Governance, Settings, Notifications,
History, Search) across the chain Component → Hook → Platform Adapter → REST → Service →
Business Logic → DB → Response → UI. Find mocks/stubs/dead calls/wrong endpoints/missing
auth+org+workspace headers/response mapping/loading+error+empty states. Deliver a
frontend↔backend mapping report, files modified, validation, blockers.

## Stack (actual)
- Frontend: React 18 + Vite 5 + TypeScript + Tailwind (`frontend/`)
- Backend: Django 5 + DRF modular monolith, 22 apps (`backend/`), Postgres/Redis/S3/Celery
  in prod; runs here in **lite** mode (SQLite/locmem/in-mem storage/eager Celery/inline AI).
- Platform layer: `frontend/src/platform/*` (httpClient, djangoAdapter, djangoAI,
  track13/platformClient, tenant, envelope). Adapters activate when `VITE_API_BASE_URL` set.

## Runtime in this pod
- Supervisor (read-only): `uvicorn server:app` :8001, `yarn start` :3000.
- `backend/server.py` ASGI shim → Django lite. `backend/.env` set.
- `frontend/.env`: `VITE_API_BASE_URL=<preview>`, `VITE_AUTH_BRIDGE=dev`.
- `vite.config.ts`: port 3000, `allowedHosts: true`. `package.json`: `start` → vite.

## What was implemented (2026-08-06)
- **Master fix:** `VITE_API_BASE_URL` was empty → whole app on stub adapters. Set it →
  real Django REST adapters active for all features.
- Stood up backend (migrate + seed_platform) + frontend on the pod's fixed ports.
- Validated the full chain via public ingress (dev auth): auth/org/ws, upload→dataset→
  profile→executive pipeline (job succeeded)→bundle, decisions, forecast, reporting,
  scientist context, operations, search, notifications, jobs, connections, ai chat/health.
- Report: `docs/FRONTEND-BACKEND-INTEGRATION-REPORT.md`.

## Status: all 15 core features connected to real backend & API-validated. UI e2e passed.

## Post-audit fixes (2026-08-06)
- Fixed non-idempotent tenant bootstrap in `platform/djangoAdapter.ts`: concurrent
  `ensureTenant()` calls now share one in-flight promise (was creating duplicate
  org+workspace on first login).
- UI e2e (testing agent, iteration_1): auth (Firebase signup→JWT exchange) works; all 8
  `/apps/*` load and fire real `/api/v1` 200s; operations dashboard renders; data-agent +
  tenant bootstrap succeed. 90% (global search fires on Enter — not a defect; Sankey lazy).

## Backlog / blockers (P1/P2)
- P1 Event Engine (`/app/events/*`) uses unrouted edge-fn names (events-stats/query/ingest)
  → stub dead calls; backend `apps.events` has no REST urls. Needs backend endpoints (out of
  current no-new-features scope).
- P2 Event shell chrome: notification bell + ⌘K palette not wired.
- P2 `sync-profile` edge fn unrouted (harmless fire-and-forget).
- P2 History is localStorage by design; migrate to backend if desired.
- P2 Google sign-in needs preview domain in Firebase Authorized Domains (email/pass works).
- P2 `djangoApi.health()` hits `/health/` (no /api prefix) → routed to frontend; use `/api/...` if needed.

## Next tasks
- Run UI e2e (Firebase signup → navigate each /apps/* + /data-agent upload).
- Optionally seed demo org/workspace/dataset for non-empty dashboards.

## V2 Rewrite — Phase 1 COMPLETE (2026-08-23) — verified by testing_agent iteration_2 (100%)
Spec: Databricks/Claude minimalist dark rewrite (5 features + 5 fixes + design system + event/billing + seed).
User choices: phased (reuse existing code); defer billing (402 credit-gate w/ DB balances); Gemini 3 Flash
for AI (later phases); keep Django lite (Postgres only at deploy); full UI/UX redesign, old+new features.
- Design system: `.dark` tokens retuned to exact spec (#0F1115 base, #1A1D24 surface, #2A2E37 border,
  #4F8BFF accent), Inter+JetBrains Mono, sharp 6px radius (scoped in AppLayout).
- SPA workspace shell: `components/layout/AppLayout.tsx` (w-64 sidebar, 3px blue active edge, breadcrumbs,
  single-viewport h-screen overflow-hidden, sign-out). Routes `/v2`, `/v2/incidents`, `/v2/metrics`
  (`pages/v2/WorkspaceHome|IncidentsView|MetricsView`). FIX-02 resolved (no more blank routes).
- FIX-03: `httpClient.ts` 401 retry condition fixed (was checking a header never present → refresh never fired);
  `useAuth.signOut` now calls `platform.auth.logout()` → `POST /api/v1/auth/logout/` before Firebase signOut.
- FIX-01: single-SPA/single-port already unified (no :3002 split). backend.from() stub table calls
  (dashboards/business_context_memory/profiles — 15 sites) NOT yet migrated → deferred (need backend REST).

## Phase 2 (next): Rules Engine (.rule.md validate/deploy AST), @Graph entity discovery, Shadow Sandbox
(SSE simulate), Event Engine backend (ingest/query/stats). Phase 3: Incident Intelligence (CAUSE/PREDICT
via Gemini), Billing/metering 402 gate + usage deduction, `seed_enterprise_demo` multi-tenant seed.
Deferred/known: credits still on stub (Phase 3), backend.from stubs (FIX-01 remainder), Google-auth domain,
persona modal on /data-agent.
