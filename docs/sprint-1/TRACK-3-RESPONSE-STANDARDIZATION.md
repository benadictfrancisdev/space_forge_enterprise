# SpaceForge Sprint 1 — Track 3: Response Standardization

**Status:** ✅ Complete  
**Date:** 2026-08-02

## Deliverable

Every DRF `/api/v1/*` response uses:

```json
{
  "success": true,
  "data": {},
  "message": "",
  "errors": [],
  "meta": { "trace_id": "..." }
}
```

## Implementation

| Piece | Path |
|-------|------|
| Envelope helpers | `backend/apps/api/envelope.py` |
| JSON renderer | `backend/apps/api/renderers.py` (`EnvelopeJSONRenderer`) |
| Exception handler | `backend/apps/api/exceptions.py` |
| Settings | `DEFAULT_RENDERER_CLASSES` → EnvelopeJSONRenderer |

**Not wrapped:** `/health/`, `/health/ready/` (ops probes stay flat).

**Pagination:** `results` → `data`; `count/next/previous` → `meta`.

## Client

Track 2 `src/platform/envelope.ts` already unwraps both native envelopes and legacy shapes.

## Tests

`pytest` auth/orgs/datasets assert `success` + `api_data()` helper.
