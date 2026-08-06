# Track 8.2 — AI Quality Engineering

**Status:** Complete  
**Date:** 2026-08-03

---

## Goal

Centralize prompt management, dataset context building, and a standard AI response envelope so every Data Agent module receives consistent, auditable AI output.

---

## Deliverables

| Component | Location | Purpose |
|-----------|----------|---------|
| Prompt Registry | `backend/ai_service/prompts/registry.py` | Versioned prompts (`chat@v1`, `forecast@v1`, …) — not embedded in React |
| Context Builder | `backend/ai_service/context.py` | Dataset profile → structured `context` + `context_hash` |
| Standard Envelope | `backend/ai_service/schemas.py` | `{ operation, result, evaluation, metadata, transport }` |
| Gateway integration | `backend/ai_service/gateway.py` | Single entry: context → prompt → router → envelope |
| Frontend parser | `src/platform/aiEnvelope.ts` | Unwrap platform + parse standard shape |
| Client fallbacks | `src/platform/aiFallbacks.ts` | Heuristic fallback when gateway fails |
| Legacy bridge | `src/platform/djangoAI.ts` | Flatten envelope for existing panels |

---

## Standard Response Shape

```json
{
  "operation": "chat",
  "result": {
    "summary": "…",
    "recommendations": [],
    "warnings": [],
    "details": { "answer": "…", "confidence": 62 },
    "confidence": 0.62
  },
  "evaluation": {
    "provider": "heuristic",
    "model": "spaceforge-heuristic-v1",
    "latency_ms": 12,
    "tokens": { "prompt": 0, "completion": 0, "total": 0 },
    "confidence": 0.62,
    "cost_usd": 0
  },
  "metadata": {
    "prompt_version": "chat@v1",
    "context_hash": "abc123…",
    "quality_flags": [],
    "schema_version": "ai@v1"
  },
  "transport": "inline"
}
```

Backward compatibility: operation-specific fields (`answer`, `forecast`, `decisions`) are also spread at the top level.

---

## Validation

```bash
npm run validate:track8:ai          # live API (backend lite required)
cd backend && pytest tests/test_ai_quality.py tests/test_ai.py -q
npm run build
```

---

## Exit Criteria

- [x] All 9 operations registered in prompt registry
- [x] Gateway returns `ai@v1` envelope with evaluation metadata
- [x] Health endpoint exposes `prompt_versions`
- [x] Frontend parses envelope and falls back gracefully
- [x] Chat, Predict, Scientist paths use `djangoAI` bridge

---

## Next

**Phase 8.3** — Database indexes, pagination, query optimization.
