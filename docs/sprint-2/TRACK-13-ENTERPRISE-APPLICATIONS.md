# Track 13 — Enterprise Intelligence Applications

**Status:** ✅ Complete — Enterprise Intelligence Suite Certified  
**Depends on:** Track 12 (Certified)

---

## Mission

Transform the Enterprise Platform Core into user-facing applications. Applications orchestrate platform APIs — they do not own business logic, KPI math, or AI routing.

---

## Architecture

```text
Enterprise Applications (React /apps/*)
        ↓
Application APIs (/api/v1/applications/*)
        ↓
Track 12 Platform APIs
        ↓
Integration + Data Platform
```

---

## Applications

| App | Route | API |
|-----|-------|-----|
| Executive Insights | `/apps/executive` | `applications/executive/bundle` |
| Journey Analytics | `/apps/journey` | `applications/journeys/` |
| Sankey Flows | `/apps/sankey` | journey analyze → sankey |
| Operational Intelligence | `/apps/operations` | `applications/operations/` |
| Decision Intelligence 2.0 | `/apps/decisions` | `applications/decisions/` |
| AI Scientist 2.0 | `/apps/scientist` | `applications/scientist/context` |
| Forecast Studio | `/apps/forecast` | `applications/forecast/scenarios` |
| Enterprise Reporting | `/apps/reporting` | `applications/reporting/generate` |

---

## Frontend

- `src/platform/track13/platformClient.ts` — platform + application API client
- `src/pages/apps/` — enterprise suite with shared shell
- Legacy Data Agent remains at `/data-agent`

---

## Backend

- `apps.enterprise_applications` — orchestration services only
- Analytics extensions: `funnel`, `cohort` operations for journeys

---

## Certification

```bash
npm run validate:track13
```

---

## Related

- [Track 12 Exit](./TRACK-12-EXIT.md)
- [Track 13 Exit](./TRACK-13-EXIT.md)
