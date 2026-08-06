# SpaceForge Enterprise Intelligence Cloud

## Status
- **Frontend** — React + Vite + TypeScript in `frontend/`
- **Backend** — Django + DRF modular monolith in `backend/`

## Architecture
Frontend → REST API → Django → FastAPI AI (later) → PostgreSQL / Redis / Object Storage

---

## Repository layout

```
frontend/     Vite · React · TypeScript · Tailwind
backend/      Django · DRF · Celery · Postgres
docs/         Sprint track documentation
scripts/      Validation & local-dev helpers
```

## Classification — Frontend vs Backend

| | **FRONTEND** | **BACKEND** |
|---|---|---|
| **Where** | `frontend/` only | `backend/` only |
| **Stack** | Vite · React · TypeScript · Tailwind | Django · DRF · Celery · Postgres |
| **Local URL** | http://localhost:8080 | http://localhost:8000 |
| **Env file** | `frontend/.env` | `backend/.env` |
| **Start** | `npm run dev:frontend` | `npm run dev:backend` **or** `npm run dev:backend:lite` |
| **You are here when editing** | `frontend/src/**`, `frontend/index.html`, Vite/Tailwind configs | `backend/apps/**`, `backend/workers/**`, `backend/config/**` |
| **What to test** | UI, upload, charts, auth screens | Swagger, `/health/`, REST `/api/v1/` |

### Frontend paths (UI work)
```
frontend/src/pages/                  → routes/pages
frontend/src/components/data-agent/  → core product UI
frontend/src/platform/               → backend adapters
frontend/src/services/api.ts         → AI/analysis wrappers
frontend/src/features/events/        → Event Engine UI
```

### Backend paths (API work)
```
backend/apps/identity|organizations|workspaces|...  → domains
backend/apps/api/urls.py                            → route map
backend/workers/                                    → Celery tasks
backend/docs/                                       → architecture docs
```

Cursor rules auto-apply when you open matching files:
- `.cursor/rules/frontend.mdc`
- `.cursor/rules/backend.mdc`

---

## Localhost — start both for testing

### 1) Frontend
```bash
cd frontend
npm install
npm run dev
```
Or from repo root: `npm run dev:frontend`

Open: http://localhost:8080

Copy env: `cp frontend/.env.example frontend/.env`

### 2) Backend (full stack — needs Docker Desktop running)
```bash
cd backend
# first time: copy .env.example → .env if missing
docker compose up --build
```
Or from root: `npm run dev:backend`

- API: http://localhost:8000  
- Swagger: http://localhost:8000/api/docs/  
- Health: http://localhost:8000/health/

### 2b) Backend lite (no Docker — SQLite)
```bash
npm run dev:backend:lite
```
Uses `config.settings.lite` + `backend/lite_db.sqlite3`. Good for API smoke tests on Windows when Docker is off.

### Dev auth (backend)
```http
Authorization: Bearer dev:<user-id>:<email>
```
Or: `POST /api/v1/auth/exchange/` with `{"token":"dev:uid:user@example.com"}`
