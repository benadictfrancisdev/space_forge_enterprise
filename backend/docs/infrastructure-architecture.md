# Infrastructure Architecture — Phase 0.1.1

## Topology

```
                 ┌────────────┐
  Clients ──────►│    api     │◄──── health/ready
                 └─────┬──────┘
           ┌───────────┼───────────┐
           ▼           ▼           ▼
      ┌────────┐  ┌────────┐  ┌────────┐
      │postgres│  │ redis  │  │ minio  │
      └────────┘  └───▲────┘  └────────┘
                      │
              ┌───────┴───────┐
              │ worker │ beat │
              └───────────────┘
```

## Responsibilities

| Service | Role |
|---------|------|
| api | Django/DRF HTTP surface, migrations on boot |
| postgres | System of record (UUID PKs, constraints, soft deletes) |
| redis | Cache, sessions, Celery broker/results, worker heartbeat |
| minio | S3-compatible object storage |
| worker | Executes jobs, heartbeats, outbox drain |
| beat | Schedules heartbeat (30s) and outbox publish (60s) |

## Storage abstraction

`ObjectStorageProvider` → `S3ObjectStorage` | `InMemoryObjectStorage`

Domains call `StorageService` / `get_object_storage()`, never boto3 directly.

## Readiness contract

`GET /health/ready` probes:

1. Database `SELECT 1`
2. Redis cache round-trip
3. Storage `health_check()`
4. Worker heartbeat key (when `READY_REQUIRE_WORKER=true`)
