# Local Development Guide

## Option A — Full stack (recommended for Phase 0.1.1)

```bash
cd backend
docker compose up --build
```

API: http://localhost:8000  
Swagger: http://localhost:8000/api/docs/  
MinIO console: http://localhost:9001 (spaceforge / spaceforgesecret)

## Option B — Unit tests only (no Docker)

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate   # Windows
pip install -r requirements.txt
pytest -q
```

Uses SQLite, locmem cache, in-memory object storage, eager Celery.

## Useful commands

```bash
docker compose logs -f api worker beat
docker compose exec api python manage.py seed_platform
python scripts/certify.py

# Windows host worker (required):
celery -A workers.celery_app worker -l info --pool=solo

# Linux / Docker worker:
celery -A workers.celery_app worker -l info
celery -A workers.celery_app call workers.platform_ping --args='["hello"]'
```

## Auth (dev)

```http
Authorization: Bearer dev:<uid>:<email>
```
