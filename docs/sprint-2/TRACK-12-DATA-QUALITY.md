# Track 12 Phase 12.3 — Data Quality Platform

**Status:** ✅ Complete  
**Wave:** 1 — Trusted Data Platform

---

## Delivered

- Validation Engine (structural checks)
- Profiling Engine (row/column stats in report)
- Duplicate Detection (row hash dedup)
- Missing Value Detection (per-column null rates)
- Schema Drift Detection (vs previous schema registry)
- PII Detection (from metadata column flags)
- Data Quality Scoring (0–100 composite)
- Quality Reports (`QualityReport` + `QualityRun`)

---

## Scoring

Deterministic composite score penalizing:

- Failed validation checks
- High duplicate rate
- High missing-value columns
- Schema drift
- PII columns present

Status: `passed` | `warning` | `failed`

---

## API

```text
POST /api/v1/quality/datasets/{id}/validate/
GET  /api/v1/quality/datasets/{id}/report/
GET  /api/v1/quality/datasets/{id}/runs/
```

Quality score syncs to catalog `quality_score`.

---

## Exit criteria

- ✅ Quality report generated for gold datasets
- ✅ Score written to catalog
- ✅ Enterprise analytics must consume validated datasets only (Wave 2 gate)
