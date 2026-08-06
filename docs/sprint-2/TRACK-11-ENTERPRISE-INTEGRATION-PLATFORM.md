# Track 11 — Enterprise Integration Platform

**Status:** In progress (Phase 11.7 complete — next: 11.8 certification polish / 11B connectors)  
**Date:** 2026-08-03  
**Depends on:** Sprint 1 backbone (jobs, datasets, storage, RBAC, audit, observability)

---

## Purpose

Replace the frontend `liveConnectorsStore` localStorage mock with a **plugin-based integration platform**. Connectors are strategy plugins; the platform owns lifecycle, credentials, scheduling, retries, dataset creation, and audit.

```
Layer 3 — Connectors (plugins): PostgreSQL · MySQL · CSV · REST · …
Layer 2 — Platform services: Framework · Credentials · Registry · Discovery · Sync · Transform
Layer 1 — Sprint 1 backbone: Jobs · Datasets · Storage · Audit · RBAC · Metrics
```

---

## Domain

New Django app: `apps.integrations`

| Phase | Focus | Exit criteria |
|-------|-------|---------------|
| 11.1 | Connector framework + echo stub | Registry resolves plugins; lifecycle tests pass (no network) |
| 11.2 | Credential management | Encrypted secrets; never in API responses ✅ |
| 11.3 | Connection registry | CRUD + `connector.test` job; UI swaps off localStorage ✅ |
| 11.4 | Schema discovery | Versioned `SchemaSnapshot` via job ✅ |
| 11.5 | Sync engine | Extract → storage → `DatasetService`; full then incremental ✅ |
| 11.6 | Transformation pipeline | Declarative JSON rules (rename, cast, nulls) ✅ |
| 11.7 | Real connectors | CSV ✅ · Excel ✅ · REST ✅ · SQL ✅ · MongoDB ✅ · S3 ✅ · SaaS ✅ |
| 11.8 | Certification | `validate-track11-*` scripts ✅ · isolation/security (11B) |

---

## Engineering rules (locked)

1. No connector bypasses the framework
2. All sync/test/discover via Track 6 jobs
3. Org + workspace scoped (`TenantBaseModel`)
4. Credentials backend-only, encrypted at rest
5. Every sync updates Dataset Registry via `DatasetService`
6. Audit connection create, credential use, sync start/finish/fail

---

## API surface (target)

```
POST/GET/DELETE  /api/v1/credentials/
POST/GET/PATCH/DELETE  /api/v1/connections/
POST  /api/v1/connections/{id}/test|discover|sync/
GET   /api/v1/connections/{id}/sync-runs|schema/
GET   /api/v1/connectors/types/
```

---

## Related docs

- [Phase 11.1 — Connector Framework](./TRACK-11-PHASE-11.1-CONNECTOR-FRAMEWORK.md)
- [Phase 11.2 — Credentials](./TRACK-11-PHASE-11.2-CREDENTIALS.md)
- [Phase 11.3 — Connection Registry](./TRACK-11-PHASE-11.3-CONNECTION-REGISTRY.md)
- [Phase 11.4 — Schema Discovery](./TRACK-11-PHASE-11.4-SCHEMA-DISCOVERY.md)
- [Phase 11.5 — Sync Engine](./TRACK-11-PHASE-11.5-SYNC-ENGINE.md)
- [Phase 11.6 — Transforms](./TRACK-11-PHASE-11.6-TRANSFORMS.md)
- [Phase 11.7 — CSV & Excel](./TRACK-11-PHASE-11.7-CSV-EXCEL.md)
- [Phase 11B.1 — REST API](./TRACK-11-PHASE-11B.1-REST.md)
- [Phase 11B.2 — PostgreSQL](./TRACK-11-PHASE-11B.2-POSTGRESQL.md)
- [Phase 11B.3 — MySQL](./TRACK-11-PHASE-11B.3-MYSQL.md)
- [Phase 11B.4 — SQL Server](./TRACK-11-PHASE-11B.4-SQLSERVER.md)
- [Phase 11B.5 — MongoDB](./TRACK-11-PHASE-11B.5-MONGODB.md)
- [Phase 11B.6 — Cloud Storage (S3)](./TRACK-11-PHASE-11B.6-CLOUD-STORAGE.md)
- [Phase 11B.7 — SaaS (Airtable, Shopify)](./TRACK-11-PHASE-11B.7-SAAS.md)
- [Certification (11.8)](./TRACK-11-CERTIFICATION.md)
- [Track 11B Certification](./TRACK-11B-CERTIFICATION.md)
- [Track 11B Exit (11B.9)](./TRACK-11B-EXIT.md)
- [Sprint 2 Architecture](./SPRINT-2-ARCHITECTURE.md) §6 Live Connectors
