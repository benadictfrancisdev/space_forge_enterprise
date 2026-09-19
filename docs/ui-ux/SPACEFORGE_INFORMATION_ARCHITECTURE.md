# SpaceForge information architecture

Target: one enterprise intelligence workspace. Routes stay under `/v2` unless a redirect already exists.

```
SPACEFORGE
├── Home                         /v2
├── Intelligence
│   ├── Executive Insights       /v2/apps/executive
│   ├── Decision Intelligence    /v2/apps/decisions
│   ├── Operational Intelligence /v2/apps/operations
│   ├── Journey Intelligence     /v2/apps/journey
│   ├── Sankey Flows             /v2/apps/sankey   (mode of Journey; keep route)
│   ├── AI Scientist             /v2/apps/scientist
│   └── Forecast Studio          /v2/apps/forecast
├── Data
│   ├── Data Agent               /v2/data-agent
│   ├── Connectors               /v2/data-agent?tab=live_connectors
│   ├── Analytics Hub            /v2/analytics
│   └── Dashboards               /v2/dashboards
├── Decisions                    /v2/apps/decisions
├── Operations
│   ├── Events                   /v2/events (+ nested Event Engine views)
│   ├── Live Metrics             /v2/metrics
│   └── Incidents                /v2/incidents
├── Knowledge
│   └── Rules                    /v2/rules
├── Reports
│   └── Enterprise Reports       /v2/apps/reporting
└── Administration (user menu)
    ├── Organization / Workspace (existing tenant APIs)
    └── Event settings           /v2/events/settings
```

Not implemented as pages until APIs exist: Data Quality, Lineage, Decision History, Automation, Members, Billing, Environments. Those use a **capability** state, not mock data.

Depth rule: Domain → Workspace → Detail. Contextual tabs instead of extra URL segments.
