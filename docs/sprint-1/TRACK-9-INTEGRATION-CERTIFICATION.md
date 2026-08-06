# Track 9.2 — Integration Certification

**Status:** Complete  
**Validation:** `npm run validate:track9:integration`

## Workflow Under Test

```
Auth → Org → Workspace → Upload → Storage → Dataset → Profile
  → Statistics → AI Chat → Decisions → Export → Job Pipeline
```

## Checks

- Full upload/profile pipeline succeeds
- Statistics endpoint returns column stats
- AI chat + decisions return `ai@v1` envelope
- Export manifest available
- `dataset.pipeline` job succeeds with forecast output
- Invalid dataset creation returns 400

## Pytest

`backend/tests/test_integration_certification.py`
