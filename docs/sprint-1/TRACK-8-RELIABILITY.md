# Track 8.7 — Reliability Engineering

**Status:** Complete  
**Date:** 2026-08-03

---

## Deliverables

| Feature | Location |
|---------|----------|
| Retry on 502–504 | `src/platform/httpClient.ts` (existing, Track 2) |
| Request timeouts | `httpClient` — default 30s, configurable per call |
| 401 token refresh + retry | `configureTokenRefresher` + `forceRefreshAccessToken()` |
| Resilience policies | `src/platform/resilience.ts` — `DEFAULT`, `AI`, `UPLOAD` |
| AI client fallbacks | `src/platform/aiFallbacks.ts` (Track 8.2) |

## 401 Recovery Flow

```
Request → 401
  → forceRefreshAccessToken() (clear cache + refresh)
  → retry once with new Bearer token
```

Wired in `src/platform/index.ts` when Django backend is configured.

## Policy Usage

```typescript
import { withResilience, AI_RESILIENCE } from "@/platform/resilience";
import { httpRequest } from "@/platform/httpClient";

await httpRequest(withResilience({ path: "/api/v1/ai/chat/", body }, AI_RESILIENCE));
```

## Next

Phase 8.8 — code quality + Track 8 exit.
