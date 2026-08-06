# Track 9.3 — AI Platform Certification

**Status:** Complete  
**Validation:** `npm run validate:track9:ai`

## Measures

| Area | Criteria |
|------|----------|
| Schema | `metadata.schema_version === ai@v1` |
| Result | `result` is object with `summary` + `details` |
| Evaluation | `provider`, `confidence`, `latency_ms` |
| Operations | All 9 ops + 5 IBI modules |
| Consistency | Same provider for repeated chat |
| Rejection | Unsupported op → 400 |

## Fix Applied

Hypothesis envelope: `**raw_content` no longer overwrites `result` (`backend/ai_service/schemas.py`).

## Pytest

`backend/tests/test_ai_certification.py` — strict envelope + hypothesis regression
