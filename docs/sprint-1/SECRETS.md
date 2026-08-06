# SpaceForge — Secret Management (Track 7)

**Rule:** Never commit real secrets. Never hardcode credentials in application code.

## Required environment variables

| Variable | Purpose | Production rule |
|----------|---------|-----------------|
| `DJANGO_SECRET_KEY` | Django crypto signing | Strong random ≥50 chars; fail-closed if insecure default |
| `JWT_SIGNING_KEY` | Access/refresh JWT HMAC | Strong random ≥32 chars; distinct preferred |
| `DATABASE_URL` | PostgreSQL | Credentials only via env / secret store |
| `REDIS_URL` / `CELERY_BROKER_URL` | Cache & queues | No public Redis without auth |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | Object storage | Rotate with provider; never use compose demo values |
| `FIREBASE_PROJECT_ID` | Identity (firebase mode) | Required when `AUTH_MODE=firebase` |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / … | AI providers | Optional; never log |

## Local development

Copy `backend/.env.example` → `backend/.env` (gitignored).  
Lite mode (`config.settings.lite`) may use SQLite + memory storage — still do not commit `.env`.

## Production

`config.settings.production` refuses to start when:

- `DJANGO_SECRET_KEY` is a known insecure default
- `JWT_SIGNING_KEY` is weak (&lt;32 chars or known demo value)
- `S3_SECRET_KEY` is a known demo value

## Rotation checklist

1. Generate new secret offline (e.g. `openssl rand -hex 32`)
2. Deploy new value to secret store / env
3. Restart Django workers + web
4. For JWT key rotation: expect all sessions invalidated (users re-exchange)
5. Revoke old cloud credentials at the provider

## Future (Track 8+)

Wire secrets from the deploy orchestrator (Compose secrets, Kubernetes Secrets, or cloud SM). Application code continues to read only `os.environ`.
