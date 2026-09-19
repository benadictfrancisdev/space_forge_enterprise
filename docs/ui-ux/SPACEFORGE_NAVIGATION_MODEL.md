# SpaceForge navigation model

## Desktop

- **Top bar:** SpaceForge, organization, workspace, environment label (workspace default — not a fake env switcher), search / command, help, theme, user.
- **Left nav:** domain groups; Event Engine nested under Operations → Events.
- **Center:** current workspace.
- **Right inspector:** collapsible context for the current domain. Pages may later inject selection; default copy is route-aware.

## Tablet

Collapsed domain rail; inspector as a drawer.

## Mobile

Bottom domains: Home, Decisions, Operations, Data, More (opens full nav). Full-screen workspaces. Rules IDE: prefer desktop; inspector remains available.

## Command palette

Ctrl/Cmd+K searches local navigation plus `platformClient.enterpriseSearch`. Results navigate; they do not invent entities.

## Breadcrumbs

Human labels from `workspaceNav` (Home / Operations / Incidents), never raw `v2 / apps / decisions`.
