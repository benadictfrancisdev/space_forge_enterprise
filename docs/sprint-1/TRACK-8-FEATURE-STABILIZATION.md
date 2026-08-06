# Track 8 — Feature Stabilization & Sidebar Audit

**Status:** 🟢 Phase 8.1 complete  
**Date:** 2026-08-03  
**Mission:** Every existing sidebar module works reliably before Sprint 2 expansion.

---

## Phase 8.1 — Delivered

| Fix | Implementation |
|-----|----------------|
| Shared nav config | `src/config/dataAgentNav.ts` — single source for sidebar + mobile |
| Mobile nav drift | `MobileBottomNav.tsx` — tab IDs aligned with sidebar (`power_bi`, `live_connectors`, …) |
| URL tab sync | `/data-agent?tab=chat` — refresh-safe deep links |
| Feature history | `featureHistoryStore.ts` + `platform` handler — list/save/pin/delete works locally |
| Live connectors | `liveConnectorsStore.ts` + `platform` handler — CRUD/sync preview works locally |
| Forecast context | `ForecastChatbot` loads Predict history when pipeline absent |
| KPI empty state | Explicit UI when no numeric KPIs detected |
| Anomaly empty state | Pre-scan CTA panel |
| Indian Intel fallback | Heuristic preview when AI call fails |

---

## 26-Module Stabilization Matrix (honest)

| Module | Backend | AI | Loading | Error | Empty | Status |
|--------|---------|----|---------| ------|-------|--------|
| Upload | ✅ REST | N/A | ✅ | ✅ | ✅ | **Complete** |
| Live Connectors | 🟡 Local store | N/A | ✅ | ✅ | ✅ | **Functional (local)** |
| Preview | ✅ Hybrid | 🟡 | ✅ | ✅ | N/A | **Complete** |
| Statistics | ✅ Hybrid | 🟡 | ✅ | ✅ | ✅ | **Complete** |
| Chat with Data | ✅ | ✅ | ✅ | ✅ | ✅ | **Complete** |
| Predict | ✅ | ✅ | ✅ | ✅ | ✅ | **Complete** |
| AI Scientist | ✅ | ✅ | ✅ | ✅ | ✅ | **Stabilized** |
| Hypothesis | ✅ | ✅ | ✅ | ✅ | ✅ | **Stabilized** |
| NLP Engine | ✅ | ✅ | ✅ | ✅ | ✅ | **Stabilized** |
| Full Narrative | ✅ | ✅ | ✅ | ✅ | 🟡 | **Stabilized** |
| Anomaly Watch | ✅ | ✅ | ✅ | ✅ | ✅ | **Improved** |
| Decisions | ✅ | ✅ | ✅ | ✅ | 🟡 | **Improved** |
| Forecast | ✅ | ✅ | ✅ | ✅ | ✅ | **Improved** |
| IBI ×5 | ✅ | ✅ + fallback | ✅ | ✅ | 🟡 | **Improved** |
| Dashboard | Client | N/A | ✅ | N/A | ✅ | **Complete** |
| Power BI | ✅ Hybrid | ✅ | ✅ | ✅ | ✅ | **Complete** |
| KPI Cards | Client | N/A | ✅ | N/A | ✅ | **Improved** |
| Charts | Client | 🟡 | ✅ | ✅ | 🟡 | **Complete** |
| Stakeholder Report | ✅ | ✅ | ✅ | ✅ | ✅ | **Complete** |
| Full Report | ✅ | ✅ | ✅ | ✅ | ✅ | **Complete** |
| History | 🟡 Local store | N/A | ✅ | ✅ | ✅ | **Functional (local)** |
| System Status | ✅ | N/A | ✅ | ✅ | ✅ | **Complete** |

Legend: ✅ production path · 🟡 partial / local-first · 🔴 broken (none remaining in Phase 8.1 scope)

---

## Requires `VITE_API_BASE_URL`

AI modules route through `djangoAI` when API is configured. Without it, AI calls use stubs — **not suitable for pilot demos**.

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000
VITE_AUTH_BRIDGE=dev
```

---

## Sprint 2 deferrals (by design)

- Django `feature-history` + `live-connectors` REST APIs (replace local stores)
- Event Engine `/app/events/*` (placeholders)
- Enterprise cards (Journey Analytics, Sankey, etc.)

---

## Next: Phase 8.2

AI feature stabilization — prompts, context, confidence, latency (no new AI capabilities).
