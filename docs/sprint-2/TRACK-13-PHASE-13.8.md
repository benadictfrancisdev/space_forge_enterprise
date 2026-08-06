# Track 13.8 — Application Certification

Enterprise application suite certification matrix.

## Certification command

```bash
npm run validate:track13   # 11 pytest tests
```

## Matrix covered

| Application | API | Test |
|-------------|-----|------|
| Executive Insights | `executive/bundle` | `test_executive_insight_bundle` |
| Journey Analytics | `journeys/analyze` | `test_journey_templates_and_analyze` |
| Sankey Flows | `sankey/visualize` | `test_sankey_visualize` |
| Decision Intelligence | `decisions/` | `test_decision_intelligence` |
| Forecast Studio | `forecast/scenarios` | `test_forecast_and_reporting` |
| Enterprise Reporting | `reporting/*` | `test_reporting_platform` |
| Operational Intelligence | `operations/` | `test_operations_dashboard` |
| AI Scientist | `scientist/context` | `test_application_certification_matrix` |
| Brief scheduling | `executive/schedule-brief` | `test_executive_brief_schedule` |
| Report exports | markdown/html/slides | `test_report_markdown_export` |

## Principles verified
- Applications orchestrate Track 12 APIs only
- No duplicated KPI/analytics/AI routing in apps
- Platform API compliance via authenticated pytest suite
- AI guardrails via verified-context reasoning paths

## Deferred (post Track 15)
- Playwright UI certification per app
- Performance/load benchmarks
- Accessibility audit automation
