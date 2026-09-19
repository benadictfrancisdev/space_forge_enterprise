# SpaceForge terminology

| Prefer | Do not use (in product chrome) |
|---|---|
| Workspace | Project, Space (unless a distinct domain exists) |
| Organization | Tenant (except engineering docs) |
| Dataset | Spreadsheet, file (except upload UI) |
| Entity | Tag (except `@entity` in rules) |
| Metric | KPI card (except as a chart type) |
| Decision | Insight card, alert (unless it is an incident) |
| Incident | Ticket (UI may still show `ticket_id`) |
| Journey | Funnel-only (Sankey is a view) |
| Workflow | Zap, automation (until Automation domain ships) |
| Agent | Bot, SpaceBot (marketing widget only) |
| Report | PDF dump |
| Knowledge | Wiki |
| Event | Log line (unless it is unstructured logs) |
| Rule | Prompt, snippet |
| Environment | “Mode” |

API field names (`organization_id`, `ticket_id`) stay as the backend sends them. Map in view models.
