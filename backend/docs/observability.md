# Observability Architecture



## Structured logging (Track 10.1)



- JSON formatter in production (`LOG_FORMAT=json`)

- Trace ID via contextvar + `TraceIdMiddleware`

- Organization ID via `TenantContextMiddleware` + query `organization_id`

- Request completion logs: method, path, status, duration_ms, user_id, organization_id

- AI request logs: operation, provider, latency_ms, organization_id



## Metrics (Track 10.2)



- In-process hooks: `apps.core.metrics` (`incr`, `gauge`, `snapshot`)

- Prometheus scrape: `GET /metrics`

- HTTP request counters/durations via `RequestLoggingMiddleware`

- AI request counters/latency via `AIGatewayService`

- Celery job counters in `workers/tasks.py`



## Health (Track 10.3)



- `GET /health/` — liveness

- `GET /health/ready/` — DB + cache + storage + worker probes

- `GET /api/v1/ops/platform-health/` — readiness + AI upstream status

- `GET /api/v1/ai/health/` — AI operations registry



## Operations APIs (Track 10.4–10.6)



- `GET /api/v1/ops/summary/` — full rollup (jobs, AI, alerts, metrics snapshot)

- `GET /api/v1/ops/jobs/summary/` — queue depth, success rate, avg execution

- `GET /api/v1/ops/ai/summary/` — invocations by operation/provider, cost, latency

- `GET /api/v1/ops/alerts/` — computed alerts (readiness, queue backlog, errors)



## Tracing



- Incoming `X-Request-ID` preserved; otherwise generated UUID

- Propagated to audit logs and API envelope `meta.trace_id`



## Future



- OpenTelemetry export, log shipping (Loki/CloudWatch), PagerDuty/Slack alert delivery


