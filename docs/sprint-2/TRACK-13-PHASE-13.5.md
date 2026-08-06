# Track 13.5 — Journey Analytics

Full journey application over platform analytics — no duplicated business logic.

## Delivered

### Backend
- `journey_analytics.py` — drop-off, stage conversion, time-in-stage, sankey builder
- Extended `JourneyDefinition` — `owner_department`, `time_column`, `entity_column`
- `JourneyService.analyze_journey` — full analysis bundle

### Frontend
- `JourneyBuilder` — create custom journeys with department ownership
- `JourneyAnalysisView` — funnel, cohort, drop-off, time-in-stage, AI summary
- `CohortBarChart`, `DropOffTable` chart components

### API outputs
- Funnel + cohort (analytics engine)
- Drop-off analysis
- Stage conversion
- Time-in-stage (when `time_column` configured)
- Sankey flow data
- AI journey summary (`explain` endpoint)
