# Track 11B Phase 11B.6 — Cloud Storage (S3)

**Status:** Implemented (S3 / MinIO)  
**Code:** `apps/integrations/connectors/s3_connector.py`, `connectors/_cloud_storage.py`

---

## Connector

| Type | Notes |
|------|-------|
| `aws_s3` | CSV / JSON / JSONL from S3 or S3-compatible endpoints (MinIO) |

---

## Config

| Field | Notes |
|-------|-------|
| `bucket`, `key` | S3 bucket and object path |
| `region` | Default `us-east-1` |
| `endpoint_url` | Optional MinIO / custom S3 endpoint |
| `fileType` | `csv`, `json`, `jsonl` (or inferred from key extension) |
| `jsonPath` / `json_path` | Dot path for JSON arrays |
| `inline_text` / `inline_b64` | Test-only payload (no network) |

## Credentials (secrets)

| Field | Usage |
|-------|-------|
| `accessKey` | AWS access key ID |
| `secretKey` | AWS secret access key |

---

## File formats

- **CSV** — header row + delimiter (default `,`)
- **JSON** — array of objects or nested path via `jsonPath`
- **JSONL** — one JSON object per line

---

## Tests

```bash
python -m pytest tests/test_cloud_storage_connectors.py -q
npm run validate:track11:pytest
```

GCS / Azure Blob connectors are planned as follow-up slices on `_cloud_storage.py`.
