# Track 9.1 — Functional Certification

**Status:** 🟢 In progress  
**Date:** 2026-08-03  
**Depends on:** Tracks 1–8 complete, backend lite running for live validation

---

## Mission

Verify every Data Agent sidebar module against expected behavior. No assumptions — each module is executed via API harness and/or documented manual UI check.

---

## Certification Harness

```bash
# Terminal 1
npm run dev:backend:lite

# Terminal 2
npm run validate:track9

# Backend pytest (no live server required)
cd backend && pytest tests/test_functional_certification.py -q
```

**Outputs:**
- Console pass/fail per module
- `docs/sprint-1/reports/track9-functional-latest.json` — machine-readable report

---

## 26-Module Functional Matrix

| Module | Group | Mode | Expected Behavior | Automated | Pass Criteria |
|--------|-------|------|-------------------|-----------|---------------|
| Upload | DATA | API | CSV → storage → dataset → profile | ✅ | `profile_status=ready`, `row_count>0` |
| Live Connectors | DATA | Local | CRUD in localStorage | ⏭️ Manual | Add/list/sync connector in UI |
| Preview | DATA | Client | Table preview of rows | ✅ | Dataset GET has schema + rows |
| Statistics | ANALYZE | API | Column statistics | ✅ | `/statistics/` returns columns |
| Chat with Data | ANALYZE | API | AI Q&A | ✅ | `ai@v1` envelope, `chat` op |
| Predict | ANALYZE | API | Forecast points | ✅ | `forecast` op, horizon array |
| AI Scientist | ANALYZE | API | EDA findings | ✅ | `scientist` op |
| Hypothesis | ANALYZE | API | Statistical test | ✅ | `hypothesis` op |
| NLP Engine | ANALYZE | API | NL query | ✅ | `nlp` op |
| Full Narrative | ANALYZE | API | Executive narrative | ✅ | `narrative` op |
| Anomaly Watch | ANALYZE | API | Anomaly scan | ✅ | `anomaly` op |
| Decisions | ANALYZE | API | Prioritized actions | ✅ | `decisions` op |
| Forecast | ANALYZE | API | Conversational forecast | ✅ | `forecast` op |
| Churn Predictor | INDIAN INTEL | API | Churn risk | ✅ | `indian-intel` module=churn |
| Inventory Optimizer | INDIAN INTEL | API | Restock guidance | ✅ | module=inventory |
| Revenue Drop | INDIAN INTEL | API | Drop diagnosis | ✅ | module=revenue_drop |
| Segmentation | INDIAN INTEL | API | Customer segments | ✅ | module=segmentation |
| Sales Performance | INDIAN INTEL | API | Rep/region compare | ✅ | module=sales_performance |
| Dashboard | VISUALIZE | Client | KPI dashboard | ✅ | Statistics prerequisites |
| Power BI | VISUALIZE | Client | Drag-drop builder | ✅ | Schema columns present |
| KPI Cards | VISUALIZE | Client | Auto KPI cards | ✅ | Numeric columns in stats |
| Charts | VISUALIZE | Client | Chart builder | ✅ | Schema ≥1 column |
| Stakeholder Report | EXPORT | API | Executive report | ✅ | `narrative` op |
| Full Report | EXPORT | API | Scientist + export | ✅ | scientist + export manifest |
| History | EXPORT | Local | Run history | ⏭️ Manual | Save/list/pin in UI |
| System Status | EXPORT | API | Health diagnostics | ✅ | `/health/` + `/api/v1/ai/health/` |

**Legend:** ✅ = `validate-track9` · ⏭️ = manual UI (local-first modules)

---

## Test Scenarios (per module)

### Upload
1. POST storage object with CSV multipart
2. POST dataset with `storage_object_id`
3. POST profile → `profile_status=ready`

### AI modules (all)
1. Auth exchange with dev bridge
2. Profiled dataset attached
3. POST `/api/v1/ai/{operation}/`
4. Assert: `result.summary|details`, `evaluation.provider`, `metadata.schema_version=ai@v1`

### Client modules (Dashboard, KPI, Charts, Preview)
1. Dataset profiled with numeric columns
2. Statistics/schema endpoints return expected shape
3. Manual: open `/data-agent?tab={tab}` and confirm render

### Local modules (History, Live Connectors)
1. Open module in UI
2. Perform CRUD action
3. Refresh page — data persists in localStorage
4. Document: not enterprise-persistent until Sprint 2 REST APIs

---

## Known Findings (for Phase 9.3)

| Module | Finding | Severity |
|--------|---------|----------|
| Hypothesis | `result` field may be legacy string (`insufficient_causal_claim`) due to `**raw_content` spread overwriting envelope | Medium — fix in AI cert |

---

## Manual UI Checklist

After `validate:track9` passes, complete manual verification:

- [ ] `/data-agent?tab=upload` — drag-drop upload works
- [ ] `/data-agent?tab=live_connectors` — add connector
- [ ] `/data-agent?tab=history` — save and pin a run
- [ ] Mobile nav (`MobileBottomNav`) — all primary tabs load
- [ ] Each ANALYZE tab shows loading → content (no blank screen)

---

## Exit Criteria (Phase 9.1)

- [ ] `npm run validate:track9` — 0 failures (2 skips allowed for local modules)
- [ ] `pytest tests/test_functional_certification.py` — all pass
- [ ] Manual UI checklist signed off
- [ ] `track9-functional-latest.json` committed or archived

---

## Next

**Phase 9.2** — End-to-end integration certification (full workflow chain).
