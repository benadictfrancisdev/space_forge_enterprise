# Track 9.8 — Reliability Certification

**Status:** Complete  
**Validation:** `npm run validate:track9:reliability`

## Failure Scenarios

| Scenario | Expected |
|----------|----------|
| Missing dataset name | 400 |
| Missing org_id on list | 400 |
| Nonexistent dataset | 404 |
| Invalid AI operation | 400 |
| Bad bearer token | 401 |
| Refresh token reuse | 401 |
| 3 concurrent AI requests | All succeed |
| Cancel terminal job | 400 |

## Pytest

`backend/tests/test_reliability_certification.py`
