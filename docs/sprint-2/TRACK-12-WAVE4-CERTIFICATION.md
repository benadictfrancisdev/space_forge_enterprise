# Track 12 Wave 4 — Certification

**Status:** ✅ Certified  
**Wave:** 4 — Enterprise Operations & Governance

---

## Certification command

```bash
npm run validate:track12:wave4
```

Report: `docs/sprint-2/reports/track12-wave4-latest.json`

---

## Governance checklist

| Area | Verified |
|------|----------|
| Policy enforcement | `governance.evaluate` + dataset evaluate API |
| RBAC extension | `governance:read`, `governance:write`, `governance:admin` |
| Dataset classification | `governance.classify` + `DatasetGovernance` |
| AI permissions | Classification gate in policy engine |
| Compliance | GDPR/SOC2/ISO control seed + compliance score |
| Audit | Policy evaluation logs + audit on classify/delete |

---

## Enterprise services checklist

| Area | Verified |
|------|----------|
| Organization configuration | Currency, timezone, industry profile |
| Notifications | Channel seed (in-app, email, webhook) |
| Search | Reindex job + query API |
| Feature flags | Upsert + list |
| Billing foundation | Usage metering events |
| Licensing | Entitlement seed + AI quota model |

---

## Performance smoke

| Metric | Target |
|--------|--------|
| Policy evaluation latency | Logged in `PolicyEvaluationLog.latency_ms` |
| Search | Indexed query on small corpus |
| Pipeline Wave 4 | Chained at 98% in `data_platform.pipeline` |

---

## Tests

`backend/tests/test_track12_wave4.py` — 5 tests covering governance, enterprise services, and full pipeline Wave 4 artifacts.
