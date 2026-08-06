# Track 8.6 — Performance Baselines

**Status:** Complete  
**Date:** 2026-08-03

---

## Frontend Baselines

Run after `npm run build`:

| Metric | Target | How to measure |
|--------|--------|----------------|
| Main chunk (gzip) | < 500 KB | `npm run validate:track8:perf` |
| Data Agent lazy chunks | Per-module < 150 KB gzip | Vite build output |
| First load (dev) | < 3s on localhost | Manual Lighthouse |

## Backend Baselines

| Endpoint | Target p95 |
|----------|------------|
| `GET /api/v1/datasets/` (page=1) | < 200ms |
| `POST /api/v1/ai/chat/` (heuristic) | < 500ms |
| `POST /api/v1/datasets/{id}/profile/` (enqueue) | < 300ms |

## Optimizations Applied (Track 8)

- Dataset list: `defer(schema, statistics)` + lean serializer
- Composite DB indexes on org-scoped list queries
- Data Agent modules remain lazy-loaded via `React.lazy` in `DataAgent.tsx`

## Validation

```bash
npm run build
npm run validate:track8:perf
```
