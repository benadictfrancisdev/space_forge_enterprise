# Deployment Guide — Phase 0.1.1

## Prerequisites

- Docker Engine + Compose v2+
- Ports free: 8000, 5432, 6379, 9000, 9001

## Deploy (clean machine)

```bash
cd backend
cp .env.example .env   # optional; Compose injects service env
docker compose up --build -d
docker compose ps
python scripts/certify.py
```

## Verify

```bash
curl -s http://localhost:8000/health/
curl -s http://localhost:8000/health/ready/
```

Ready must return `"status":"ready"` with database, redis, storage, and worker ok.

## Production notes

- Set `DJANGO_SETTINGS_MODULE=config.settings.production`
- Inject strong `DJANGO_SECRET_KEY` and `JWT_SIGNING_KEY` via secrets
- Terminate TLS at the edge; keep internal service DNS private
- Back up Postgres volume; enable Redis persistence if required by RPO
- Replace MinIO with managed S3 by changing `S3_*` env vars only

## Rolling updates

1. Build new image
2. Migrate via api entrypoint (idempotent)
3. Recreate api → worker → beat
