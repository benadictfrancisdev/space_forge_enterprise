# Track 13.7 — Enterprise Reporting Platform

Reporting orchestration over insight bundles with multi-type support and scheduling.

## Delivered

### Report types
- Board, Executive, Operational, Department, Financial, Compliance

### Backend
- `ScheduledReport` model + migration
- `ReportingService` — type-specific sections, schedule, beat worker
- `GET /applications/reporting/types/`
- `POST /applications/reporting/schedule/`
- `GET /applications/reporting/schedules/`
- Webhook `enterprise.report.ready` on delivery

### Frontend
- Report type selector
- Schedule daily action
- HTML / Markdown / Deck JSON / Print-to-PDF exports

## Deferred
- Native PDF/PPTX generation (post Track 15)
