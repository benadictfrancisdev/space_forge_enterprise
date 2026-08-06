# Track 12 Phase 12.9 — Governance Platform

**Status:** ✅ Complete  
**Wave:** 4 — Enterprise Operations & Governance

---

## Delivered

- Identity governance — departments, teams, org/workspace scoped policies
- Role hierarchy model for permission inheritance
- Dynamic policy evaluation (classification + RBAC + policy rules)
- Dataset classification — Public, Internal, Confidential, Restricted
- Unified lineage graph — connector → dataset → analytics → AI → report
- Compliance engine — GDPR, SOC2, ISO 27001 control registry (readiness)
- Retention policies and consent metadata
- Right-to-delete workflow (`governance.delete_request`)
- Security policies — encryption, secret rotation, API, dataset/AI access
- Governance dashboard — violations, compliance/security scores, sensitive assets

---

## Rules

- Governance policies are **enterprise scope** — distinct from `business_rules.Policy` (KPI rules) and `ai_platform.GuardrailPolicy` (runtime AI checks)
- Restricted datasets block AI unless `governance:admin`
- Classification syncs to `metadata.BusinessMetadata`
- All policy evaluations logged to `PolicyEvaluationLog` + audit trail

---

## API

```text
GET/POST /api/v1/governance/departments|teams|policies/
GET/POST /api/v1/governance/compliance/|security-policies/ (+ seed)
GET      /api/v1/governance/dashboard/?organization_id=

GET  /api/v1/governance/datasets/{id}/governance|lineage/
POST /api/v1/governance/datasets/{id}/classify|evaluate|consent|sync-lineage|delete-request/
```

Jobs: `governance.evaluate`, `governance.classify`, `governance.delete_request`, `governance.lineage`
