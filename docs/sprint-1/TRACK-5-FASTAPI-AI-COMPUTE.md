# SpaceForge Sprint 1 — Track 5: FastAPI AI Compute (Level 2)

**Status:** ✅ Foundation + Level 2 phases 5.1–5.4 complete  
**Date:** 2026-08-02  
**Roadmap:** [REVISED-ENTERPRISE-ROADMAP.md](./REVISED-ENTERPRISE-ROADMAP.md)

## Role (locked)

```
React → Platform Adapter → Django /api/v1/ai/*
        → FastAPI Gateway → Model Router → Operation Registry → Provider
```

UI never selects providers. FastAPI never owns orgs/datasets/files.

---

## Level 2 phases

| Phase | Status | Implementation |
|-------|--------|----------------|
| 5.1 AI Gateway | ✅ | `ai_service/gateway.py` — single `run_gateway()` |
| 5.2 Model Router | ✅ | `ai_service/router.py` + providers (gpt/claude/gemini/deepseek/llama/heuristic) |
| 5.3 Operation Registry | ✅ | `ai_service/registry.py` + `operations.py` |
| 5.4 AI Evaluation | ✅ | `evaluation: { provider, model, latency_ms, tokens, confidence, cost_usd }` |

### Provider notes

- **Heuristic** always available (default for Sprint 1).
- GPT / Claude / Gemini / DeepSeek / Llama shells activate when env API keys exist; live HTTP completion is deferred until certified (router falls back to heuristic).
- Order: `AI_PROVIDER_ORDER=gpt,claude,heuristic` (optional).

### Evaluation example

```json
{
  "operation": "chat",
  "result": { "answer": "...", "confidence": 62 },
  "model": "spaceforge-heuristic-v1",
  "latency_ms": 4,
  "evaluation": {
    "provider": "heuristic",
    "model": "spaceforge-heuristic-v1",
    "latency_ms": 4,
    "tokens": { "prompt": 120, "completion": 80, "total": 200 },
    "confidence": 0.62,
    "cost_usd": 0.0
  },
  "transport": "inline"
}
```

---

## Next (not Track 5)

- **Track 6** ✅ — Enterprise Execution Engine  
- **Track 7** — Enterprise Security Certification (pilot gate)  
- Frontend modernization **after** Tracks 6–10
