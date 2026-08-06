# SpaceForge Sprint 1 — Track 2: Platform API Integration

**Status:** Implemented (Phases 2.1–2.6)  
**Date:** 2026-08-02  
**Governance:** [API Ownership Matrix](./TRACK-1.5-API-OWNERSHIP-MATRIX.md) · [Domain Ownership](./TRACK-1.5-DOMAIN-OWNERSHIP-MAP.md)

---

## Scope (locked)

No FastAPI. No AI. No Celery workers. Infrastructure + first production data flow only.

| Phase | Deliverable | Location |
|-------|-------------|----------|
| 2.1 | REST adapter (fetch, not Axios) | `src/platform/httpClient.ts`, `djangoAdapter.ts` |
| 2.2 | JWT exchange + org/workspace headers | `src/platform/djangoAuth.ts`, `tenant.ts` |
| 2.3 | Envelope normalization (raw + future envelope) | `src/platform/envelope.ts` |
| 2.4 | Central errors (401/403/404/422/500/network/timeout) | `src/platform/errors.ts` |
| 2.5 | Upload → Storage → Dataset Metadata → List | `djangoApi.uploadAndRegisterDataset` + `DataUpload` |
| 2.6 | Health validation | `djangoApi.health` / `ready` · `scripts/validate-track2.mjs` |

Still stubbed: AI, named functions (except `save-dataset` bridge), realtime, notifications DB query builder.

---

## Call path

```
React
  → platform / backend façade (src/platform/index.ts)
    → DjangoAuthService.getAccessToken() → POST /api/v1/auth/exchange/
    → httpClient (+ X-Organization-ID, X-Workspace-ID)
      → Django REST
        → PostgreSQL / (storage bytes via Django → MinIO or memory in lite)
```

---

## Env

```
VITE_API_BASE_URL=http://localhost:8000
VITE_AUTH_BRIDGE=dev   # local Django AUTH_MODE=dev
```

---

## Validate

```bash
# Backend lite must be running on :8000
npm run validate:track2
```

---

## Out of scope (do not start yet)

Track 3 Django envelope emit · Track 4 profiling pipeline · Track 5 FastAPI AI
