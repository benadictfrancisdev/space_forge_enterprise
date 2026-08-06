# Track 9.7 — Performance Certification

**Status:** Complete  
**Validation:** `npm run validate:track9:perf` (requires `npm run build`)

## Baselines

| Metric | Target |
|--------|--------|
| Largest JS chunk (gzip) | ≤ 500 KB |
| Dataset list API | ≤ 500 ms |
| AI chat (heuristic) | ≤ 2000 ms |
| Profile enqueue | ≤ 1000 ms |

Report: `docs/sprint-1/reports/track9-performance-latest.json`
