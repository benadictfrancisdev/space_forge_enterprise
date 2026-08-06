# Environment Setup

| Variable | Dev | Test | Production |
|----------|-----|------|------------|
| `DJANGO_SETTINGS_MODULE` | `config.settings.local` | `config.settings.test` | `config.settings.production` |
| `DATABASE_URL` | Postgres (Compose) or SQLite | SQLite memory | Managed Postgres |
| `REDIS_URL` | Compose Redis | locmem cache | Managed Redis |
| `STORAGE_BACKEND` | `s3` | `memory` | `s3` |
| `AUTH_MODE` | `dev` | `dev` | `firebase` |
| `READY_REQUIRE_WORKER` | `false` locally / `true` in Compose | `false` | `true` |
| `LOG_FORMAT` | `console` | `console` | `json` |

Copy `.env.example` → `.env` for host-side tooling. Compose services override connection hosts (`postgres`, `redis`, `minio`).
