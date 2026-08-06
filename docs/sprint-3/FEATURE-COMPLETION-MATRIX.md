# Sprint 3 — Feature Completion Matrix

| Feature | UI | API | Wired to Django | E2E certified |
|---------|----|-----|-----------------|---------------|
| CSV upload → dataset | Data Agent | `/api/v1/storage/`, `/api/v1/datasets/` | Yes | Golden path test |
| Full pipeline | Data Agent auto + Executive | `/api/v1/data-platform/datasets/{id}/pipeline/` | Yes | Golden path test |
| Executive bundle | `/apps/executive` | `/api/v1/applications/executive/bundle/` | Yes | Golden path test |
| Decision intelligence | `/apps/decisions` | `/api/v1/applications/decisions/` | Yes | Golden path test |
| Report generate | `/apps/reporting` | `/api/v1/applications/reporting/generate/` | Yes | Golden path test |
| DB connect test/save | Database tab | `db-connect` → connections API | Yes | Manual |
| CSV/JSON URL connectors | Workflow Builder | `fetch-connector-data` | Partial (URL fetch) | Manual |
| Live connectors | Connectors UI | `live-connectors` | Yes | Track 11 tests |
| Journey analytics | `/apps/journey` | applications/journey | Yes | Track 13 tests |
| Sankey viz | `/apps/sankey` | applications/sankey | Yes | Track 13 tests |
| Scheduled reports | Reporting UI | reporting/schedule | Yes | Track 13 tests |
| Google Sheets / Notion / etc. | Workflow Builder | — | No (stub message) | — |

**Legend:** Wired = frontend `backend.functions.invoke` or platform client hits real Django, not `StubBackendFunctionService`.
