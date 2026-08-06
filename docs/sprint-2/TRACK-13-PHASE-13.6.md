# Track 13.6 — Sankey Visualization Engine

Reusable flow visualization consuming Journey Analytics APIs.

## Delivered

### Backend
- `SankeyService` — visualize from journey or dataset + flow type
- `POST /api/v1/applications/sankey/visualize/`

### Frontend
- `SankeyVizEngine` — reusable nodes + flow bars component
- Flow types: customer, order, employee, ticket, custom
- Dataset-only mode (template stages) or journey-bound mode

## Architecture

Sankey does not own funnel math — it consumes `funnel` / `sankey` from analytics orchestration.
