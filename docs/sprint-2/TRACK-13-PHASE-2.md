# Track 13 Phase 2 — Enterprise Intelligence Enhancements

Post-MVP polish for the enterprise application suite: richer visualizations, scheduled executive briefs, markdown export, global shell search, and Data Agent platform bridge.

## Delivered

### Shared UI (`src/components/enterprise/`)
- **PlatformDatasetPicker** — dataset selector backed by platform APIs
- **InsightPanels** — KPI grid, recommendations, governance summary
- **JourneyCharts** — funnel + flow bar charts (Recharts)
- **DecisionResultView** — structured decision output + executive brief card
- **EnterpriseGlobalSearch** — cross-app search in enterprise shell
- **formatExecutiveBrief** — markdown brief formatter

### Backend
- **ExecutiveBriefSchedule** model + migration `0002_track13_phase2`
- **InsightService** — `schedule_brief`, `list_brief_schedules`, `run_brief_for_job`
- **ReportingService** — `markdown` field on generated reports
- **API** — `POST /applications/executive/schedule-brief/`, `GET /applications/executive/brief-schedules/`
- **Job** — `enterprise_applications.executive_brief` worker task

### App pages
- **Executive Insights** — polished layout, schedule brief action
- **Journey Analytics** — funnel chart; Sankey flow visualization
- **Decision Intelligence** — structured result view
- **Enterprise Reporting** — markdown download
- **Enterprise shell** — global search in sidebar

### Data Agent bridge
- After Django upload success (`isApiConfigured`), toast with link to `/apps/executive`

## Validation

```bash
npm run validate:track13
```

Includes tests for brief scheduling and markdown export.

## Completed in Phase 3
See [TRACK-13-PHASE-3.md](./TRACK-13-PHASE-3.md).
