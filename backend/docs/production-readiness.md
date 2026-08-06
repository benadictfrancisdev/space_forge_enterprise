# Production Readiness Checklist — Phase 0.1

- [ ] `DJANGO_SECRET_KEY` and `JWT_SIGNING_KEY` rotated
- [ ] `DEBUG=false`, HTTPS terminated at edge
- [ ] Postgres backups configured
- [ ] Redis persistence/HA decided
- [ ] MinIO/S3 credentials via secret manager
- [ ] `AUTH_MODE=firebase` with correct project ID
- [ ] CORS allowlist limited to real frontends
- [ ] Migrations applied (`manage.py migrate`)
- [ ] `seed_platform` run once per environment
- [ ] Celery worker + beat supervised
- [ ] Health/ready wired into orchestrator probes
- [ ] Log aggregation scraping JSON logs
- [ ] Rate limiting at gateway
- [ ] Error reporting sink configured (Phase 0.2+)
- [ ] Load test org/workspace create path
- [ ] Frontend REST adapters behind `VITE_API_BASE_URL` (not yet required for 0.1 backend complete)
