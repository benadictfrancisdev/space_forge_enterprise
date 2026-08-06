# SpaceForge Backend — Phase 0.1 / 0.1.1

Enterprise modular monolith (Django + DRF) with Celery workers, PostgreSQL, Redis, and S3-compatible storage.

## Quick start

```bash
cd backend
cp .env.example .env
docker compose up --build
```

API: http://localhost:8000  
Swagger: http://localhost:8000/api/docs/  
Health: http://localhost:8000/health/  
Ready: http://localhost:8000/health/ready/

## Local tests (no Docker required)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest -q
```

Uses SQLite, locmem cache, in-memory storage, eager Celery (`AUTH_MODE=dev`).

## Phase 0.1.1 certification

```bash
docker compose up --build -d
python scripts/certify.py
pytest -q
```

Docs: `docs/infrastructure-architecture.md`, `docs/deployment-guide.md`, `docs/environment-setup.md`, `docs/local-development.md`, `docs/platform-certification-report.md`.

## Auth (dev)

```http
Authorization: Bearer dev:<user-id-or-uid>:<email>
```

Or exchange for a SpaceForge JWT:

```http
POST /api/v1/auth/exchange/
{"token": "dev:uid:user@example.com"}
```

Set `AUTH_MODE=firebase` and `FIREBASE_PROJECT_ID` for production identity bridge.

## Domains

`core` · `identity` · `organizations` · `workspaces` · `memberships` · `permissions` · `storage` · `datasets` · `notifications` · `jobs` · `events` · `audit` · `billing` · `platform` · `api` · `workers`
