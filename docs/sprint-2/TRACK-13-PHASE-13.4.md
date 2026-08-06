# Track 13.4 — Decision Intelligence 2.0

Flagship decision support application orchestrating the full enterprise reasoning chain.

## Architecture

```text
Business Problem
        │
Business Rules Engine
        │
Analytics Engine
        │
Enterprise Intelligence Engine
        │
Recommendation Engine
        │
Risk Scoring
        │
Impact Analysis
        │
AI Reasoning Layer
        │
Executive Decision Support
```

Applications orchestrate Track 12 platform APIs only — no duplicated KPI, analytics, or AI routing logic.

## Backend

- `application/decision_reasoning.py` — deterministic assembly of decision outputs
- `DecisionService.analyze_problem` — full orchestration chain
- `GET /api/v1/applications/decisions/{id}/` — retrieve persisted case

### Decision support outputs

| Field | Source |
|-------|--------|
| Problem summary | User input |
| Root causes | KPI breaches, rule failures, anomalies |
| Supporting evidence | KPIs, rules, analytics, recommendations |
| Business impact | KPI variance, policy violations, financial snapshot |
| Confidence score | Quality score + evidence depth |
| Risk assessment | KPI/rule/policy/anomaly factors |
| Recommended actions | Recommendation engine |
| Expected ROI | Heuristic from priority + variance |
| Assumptions used | Pipeline and engine metadata |
| Linked reports & KPIs | Dataset + report type links |
| Executive narrative | AI reasoning over verified context |

## Frontend

- `DecisionIntelligenceApp` — full analysis workflow
- `ReasoningChainView` — visual chain stages
- `DecisionResultView` — structured decision support panels

## Validation

Covered by `test_decision_intelligence` in `npm run validate:track13`.

## Next

- **13.5** Journey Analytics (builder, cohort, time-in-stage)
- **13.6** Sankey visualization engine
- **13.7** Enterprise Reporting platform
- **13.8** Application certification matrix
