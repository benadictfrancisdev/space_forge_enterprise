# Track 10 — Observability & Operations Center

**Status:** Certified  
**Validation:** `npm run validate:track10:all`

---

## Phase Summary

| Phase | Focus | Script |
|-------|-------|--------|
| 10.1 | Structured logging | `validate:track10:logging` |
| 10.2 | Metrics export | `validate:track10:metrics` |
| 10.3 | Health monitoring | `validate:track10:health` |
| 10.4 | Job monitoring | `validate:track10:jobs` |
| 10.5 | AI operations | `validate:track10:ai-ops` |
| 10.6 | Alerting | `validate:track10:alerts` |
| 10.7 | Operations acceptance | `validate:track10:acceptance` |

---

## One-Command Certification

```bash
npm run dev:backend:lite          # Terminal 1
npm run validate:track10:all      # Terminal 2
npm run validate:track10:pytest   # Backend ops tests only
```

---

## API Surfaces

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /metrics` | Public | Prometheus text metrics |
| `GET /health/` | Public | Liveness |
| `GET /health/ready/` | Public | Readiness (DB, cache, storage, worker) |
| `GET /api/v1/ops/platform-health/` | Public | Platform + AI dependency health |
| `GET /api/v1/ops/summary/` | `ops:read` | Full ops rollup |
| `GET /api/v1/ops/jobs/summary/` | `job:read` | Job queue stats |
| `GET /api/v1/ops/ai/summary/` | `audit:read` | AI invocation rollup |
| `GET /api/v1/ops/alerts/` | `ops:read` | Computed operational alerts |

---

## Reports

JSON reports: `docs/sprint-1/reports/track10-{phase}-latest.json`

---

## Exit Criteria

- [x] Structured logs include trace_id + organization_id
- [x] `/metrics` exposes HTTP and AI counters
- [x] Dependency health includes AI service
- [x] Job and AI ops summaries available per org
- [x] Alert rules computed from platform state
- [x] `validate:track10:all` passes with backend running

---

## Proceed To

**Sprint 1 Exit Report** — official engineering baseline  
**Sprint 2** — Connectors, semantic layer, collaboration (see `docs/sprint-2/`)
