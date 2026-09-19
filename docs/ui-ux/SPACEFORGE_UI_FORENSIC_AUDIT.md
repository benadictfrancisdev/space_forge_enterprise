# SpaceForge UI forensic audit

Status: baseline captured 2026-09-06. Implementation follows Phases A–F in `SPACEFORGE_UI_MIGRATION_PLAN.md`.

## Current information architecture

The SPA is two products:

1. **Marketing** (`/`, pricing, docs, blog, compare, cognitive, persona reports, leaderboard).
2. **Workspace** (`/v2/*`) — unified shell with a leftover catalog of tools.

Authenticated work was recently redirected into `/v2`, but navigation still lists Control plane, Intelligence apps, Data, and Event Engine as peer catalogs.

## Current routes

Canonical workspace prefix: `/v2`.

| Path | Surface |
|---|---|
| `/v2` | Workspace home (module cards) |
| `/v2/rules` | Markdown-as-Logic IDE |
| `/v2/incidents` | Incident list + artifact drawer |
| `/v2/metrics` | Latency/throughput tiles |
| `/v2/analytics/*` | Analytics hub |
| `/v2/dashboards` | Dashboard builder |
| `/v2/data-agent` | Data Agent (internal tab product) |
| `/v2/apps/*` | Enterprise intelligence apps |
| `/v2/events/*` | Event Engine |
| Legacy `/data-agent`, `/apps`, `/app/events`, `/analytics`, `/decisions` | Redirect into `/v2` |

Unknown `/v2/*` previously redirected to home (404 swallowed).

## Current navigation

- Workspace sidebar: ~22 primary items in four groups.
- Data Agent: nested ~25-tab sidebar + mobile bottom bar.
- Marketing Navbar: Rule Engine / Enterprise Suite / Decision Feed (overlapping names).
- Dead shell: `frontend/src/app/layout/AppLayout.tsx` (Casual Mode, not routed).
- Orphan: `EnterpriseAppsLayout` after `/apps` redirect.

## Current component architecture

- shadcn primitives in `components/ui/`.
- Platform HTTP in `frontend/src/platform/`.
- Duplicate empty states: `StateView` vs `PlatformStates`.
- Duplicate toasters: Radix + Sonner.
- Duplicate Rule IDEs: `pages/v2/RulesIDE.tsx` (live) vs `features/v2_rule_ide`.
- Command palette only in unused Event `AppShell` path.

## UX problems

See the approval report: tool-directory IA, no tenant chrome, demo seed CTAs, decision-as-form, incident-as-drawer, metrics-as-tiles, nested Data Agent OS, missing Cmd+K, URL breadcrumbs, marketing language in product.

## Duplicated patterns

Decision surfaces (3), AI Scientist (2), Forecast (2), Analytics (3), Journey vs Sankey, Metrics vs Event dashboard, two AppLayouts, two Rule IDEs.

## Inconsistent terminology

Workspace / Platform / Rule Engine / Control plane / Enterprise Suite / Apps / Legacy Data Agent / Cognitive Mode / Track 13.

## Dead-end flows

`/v2/casual` (unrouted), Event settings “coming online”, stub Cmd+K, notifications with no inbox, wildcard navigate to `/v2`.

## Mobile problems

Hamburger for entire workspace; Data Agent bottom nav is a second IA; no incident/decision phone workspace; Monaco has no fallback.

## Accessibility problems

Raw path breadcrumbs; custom icon buttons without consistent names; charts largely unlabeled; no skip link; reduced-motion unused.

## Enterprise UX problems

Org/workspace IDs in localStorage only; no environment; demo generators as empty-state heroes; Track 13 badges.

## Recommended IA and navigation

Eight domains: Home, Intelligence, Data, Decisions, Operations, Knowledge, Reports. Administration in the user menu. Event Engine nested under Operations. Keep `/v2` paths; do not invent pages without APIs.

## Migration risks

Double sidebar if Data Agent stays nested; bookmark breakage if routes are renamed; fake KPIs on Home; wrong shell if orphan layouts are rewired.
