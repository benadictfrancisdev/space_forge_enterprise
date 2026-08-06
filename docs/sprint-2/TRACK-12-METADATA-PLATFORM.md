# Track 12 Phase 12.2 — Metadata Platform

**Status:** ✅ Complete  
**Wave:** 1 — Trusted Data Platform

---

## Delivered

- Column Registry (`ColumnMetadata`) with PII flags
- Relationship Registry (`DatasetRelationship`)
- Metadata Repository via column + business metadata APIs
- Ownership (`BusinessMetadata.business_owner`, catalog `owner`)
- Tags (`MetadataTag`)
- Version History via `SchemaRegistryEntry`
- Business Metadata (`BusinessMetadata`)
- Schema Registry (`SchemaRegistryEntry`)

---

## Rules

- No feature inspects raw dataset bytes for schema — use metadata APIs
- PII detection is deterministic (column name + pattern heuristics), not LLM
- Schema registry marks one `is_current` entry per version

---

## Auto-extraction

Chained after `data_platform.pipeline` completes, or manual:

`POST /api/v1/metadata/datasets/{id}/extract/`

---

## Exit criteria

- ✅ Columns extracted from gold schema
- ✅ Schema registry versioned
- ✅ PII columns flagged
- ✅ Tags and business metadata CRUD operational
