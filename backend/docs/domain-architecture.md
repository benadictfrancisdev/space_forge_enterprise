# Domain Architecture

| Domain | Responsibility |
|--------|----------------|
| core | Base models, middleware, logging, exceptions |
| identity | Users, Firebase/JWT bridge, tenant headers |
| organizations | Org lifecycle |
| workspaces | Workspace lifecycle within orgs |
| memberships | User ↔ org/workspace role bindings |
| permissions | Roles, permissions, RBAC checks |
| storage | Object metadata + S3 adapter |
| datasets | Dataset metadata registry (no analytics) |
| notifications | In-app/email/webhook notification records |
| jobs | Async job records + enqueue |
| events | Outbox event bus |
| audit | Immutable audit trail |
| billing | Plans + billing accounts (foundation only) |
| platform | Health/ready, seed commands |
| api | Versioned URL composition, pagination, errors |
| integrations | Connector framework, credentials, sync (Track 11) |
| data_platform | Layered data pipeline, catalog, lineage (Track 12.1) |
| metadata | Column/schema registry, tags, business metadata (Track 12.2) |
| quality | Data quality validation and scoring (Track 12.3) |
| business_rules | KPI, financial, rules, policies (Track 12.4) |
| analytics | Deterministic analytics engines (Track 12.5) |
| intelligence | Semantic, graph, glossary, recommendations (Track 12.6) |
| ai_platform | Enterprise AI — guardrails, RAG, observability (Track 12.7) |
| query_compute | SQL generation and DuckDB execution (Track 12.8) |
| governance | Policies, classification, compliance, lineage (Track 12.9) |
| enterprise_services | Config, search, flags, metering, licensing (Track 12.10) |
| enterprise_applications | Track 13 app orchestration (journeys, insights, reports) |
| workers | Celery tasks |

## Dependency rules

- `api` may call `application` only
- `application` may call other domains' application services and infrastructure models
- Domains must not import each other's `api` layer
- Workers call application services, never viewsets
