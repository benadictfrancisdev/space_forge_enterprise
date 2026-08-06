# Track 12 — Enterprise Platform Core (Wave 1)

**Status:** ✅ Wave 1 complete · ✅ Wave 2 complete · ✅ Wave 3 complete · ✅ Wave 4 complete · **Track 12 complete**
**Sprint:** Sprint 2 — Enterprise Intelligence Foundation  
**Depends on:** Track 11A + Track 11B (Certified)

---

## Mission

Track 11 solved **how enterprise data enters SpaceForge**.  
Track 12 Wave 1 solves **how SpaceForge stores, describes, and validates enterprise data** before any analytics or AI layer consumes it.

---

## Wave 4 — Enterprise Operations & Governance

| Phase | Focus | Status |
|-------|-------|--------|
| 12.9 | Governance Platform | ✅ |
| 12.10 | Enterprise Services Platform | ✅ |

---

## Wave 3 — Trusted AI

| Phase | Focus | Status |
|-------|-------|--------|
| 12.7 | AI Platform | ✅ |
| 12.8 | Query & Compute Platform | ✅ |

---

## Wave 2 — Trusted Intelligence

| Phase | Focus | Status |
|-------|-------|--------|
| 12.4 | Business Rules Platform | ✅ |
| 12.5 | Analytics Platform | ✅ |
| 12.6 | Enterprise Intelligence Platform | ✅ |

---

## Wave 1 — Trusted Data Platform

| Phase | Focus | Status |
|-------|-------|--------|
| 12.1 | Enterprise Data Platform | ✅ |
| 12.2 | Metadata Platform | ✅ |
| 12.3 | Data Quality Platform | ✅ |

---

## Architecture

```text
Integration (Track 11)
        │
        ▼
Landing Zone → Bronze → Silver → Gold
        │
        ├── Dataset Versioning + Catalog + Lineage
        ├── Metadata (columns, schema registry, tags, business metadata)
        └── Quality (validation, profiling, duplicates, PII, scoring)
```

Every dataset entering SpaceForge must pass through this pipeline. Connector sync auto-enqueues `data_platform.pipeline`.

---

## Django domains

| App | Responsibility |
|-----|----------------|
| `apps.data_platform` | Layers, versions, catalog, lineage, pipeline runs |
| `apps.metadata` | Column registry, schema registry, tags, business metadata |
| `apps.quality` | Quality runs, reports, deterministic scoring |
| `apps.business_rules` | KPI, financial, rules, policies (Track 12.4) |
| `apps.analytics` | Statistics, forecast, anomaly, ML baseline (Track 12.5) |
| `apps.intelligence` | Semantic layer, graph, glossary, recommendations (Track 12.6) |
| `apps.ai_platform` | Enterprise AI — guardrails, RAG, observability (Track 12.7) |
| `apps.query_compute` | SQL generation and DuckDB execution (Track 12.8) |
| `apps.governance` | Policies, classification, compliance, lineage (Track 12.9) |
| `apps.enterprise_services` | Config, search, flags, metering, licensing (Track 12.10) |

---

## API surface

```text
GET   /api/v1/data-platform/catalog/
POST  /api/v1/data-platform/datasets/{id}/pipeline/
GET   /api/v1/data-platform/datasets/{id}/versions|layers|lineage|catalog|pipeline-runs/

GET   /api/v1/metadata/datasets/{id}/columns|relationships|tags|schema-registry|business/
POST  /api/v1/metadata/datasets/{id}/tags|extract/

POST  /api/v1/quality/datasets/{id}/validate/
GET   /api/v1/quality/datasets/{id}/runs|report/

GET/POST /api/v1/business-rules/kpis|policies/
POST  /api/v1/business-rules/datasets/{id}/evaluate/

POST  /api/v1/analytics/datasets/{id}/compute/
GET   /api/v1/analytics/datasets/{id}/runs|results/

GET/POST /api/v1/intelligence/semantic-models|glossary|industry-models/
POST  /api/v1/intelligence/datasets/{id}/enrich/
GET   /api/v1/intelligence/datasets/{id}/context|graph|recommendations/

POST /api/v1/ai-platform/datasets/{id}/reason|embed|rag/
GET  /api/v1/ai-platform/prompts|agents|observability/

POST /api/v1/query-compute/datasets/{id}/generate-sql|execute/
GET  /api/v1/query-compute/datasets/{id}/executions|plans|worker-pools/

GET/POST /api/v1/governance/departments|teams|policies|compliance|security-policies|dashboard/
GET/POST /api/v1/governance/datasets/{id}/governance|lineage|classify|evaluate|consent|sync-lineage|delete-request/

GET/POST /api/v1/enterprise-services/configuration|feature-flags|search|usage|licensing|webhooks|notification-channels/
```

---

## Job types (Wave 4)

| Job | Purpose |
|-----|---------|
| `governance.evaluate` | Dynamic policy evaluation |
| `governance.classify` | Dataset classification |
| `governance.delete_request` | Right-to-delete workflow |
| `governance.lineage` | Unified lineage sync |
| `enterprise_services.search_reindex` | Global search index rebuild |
| `enterprise_services.meter` | Usage metering event |
| `track12.wave4` | Full Wave 4 for a dataset + org |

Wave 4 is auto-chained at end of `data_platform.pipeline` after Wave 3.

---

## Job types (Wave 3)

| Job | Purpose |
|-----|---------|
| `ai_platform.reason` | AI narrative/chat over verified facts |
| `ai_platform.embed` | Dataset row embeddings |
| `ai_platform.rag` | RAG retrieval + reasoning |
| `query_compute.execute` | DuckDB SQL execution |
| `track12.wave3` | Full Wave 3 for a dataset |

Wave 3 is auto-chained at end of `data_platform.pipeline` after Wave 2.

---

## Certification

```bash
npm run validate:track12:wave1
npm run validate:track12:wave2
npm run validate:track12:wave3
npm run validate:track12:wave4
```

---

## Related docs

- [Data Platform (12.1)](./TRACK-12-DATA-PLATFORM.md)
- [Metadata Platform (12.2)](./TRACK-12-METADATA-PLATFORM.md)
- [Data Quality (12.3)](./TRACK-12-DATA-QUALITY.md)
- [Business Rules (12.4)](./TRACK-12-BUSINESS-RULES.md)
- [Analytics Platform (12.5)](./TRACK-12-ANALYTICS-PLATFORM.md)
- [Enterprise Intelligence (12.6)](./TRACK-12-ENTERPRISE-INTELLIGENCE.md)
- [AI Platform (12.7)](./TRACK-12-AI-PLATFORM.md)
- [Query & Compute (12.8)](./TRACK-12-QUERY-COMPUTE.md)
- [Governance (12.9)](./TRACK-12-GOVERNANCE.md)
- [Enterprise Services (12.10)](./TRACK-12-ENTERPRISE-SERVICES.md)
- [Wave 4 Certification](./TRACK-12-WAVE4-CERTIFICATION.md)
- [Track 12 Exit](./TRACK-12-EXIT.md)

---

## Proceed to

**Track 13 — Enterprise Intelligence Applications** (applications consume platform only)
