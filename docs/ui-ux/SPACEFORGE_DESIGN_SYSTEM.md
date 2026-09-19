# SpaceForge design system (workspace)

## Principles

Density, contrast, position, and typography create hierarchy. Semantic color is for status only. No glassmorphism, hero voids, or rainbow KPI cards in the application shell.

## Type

- UI: Inter
- Code / IDs: JetBrains Mono
- Page title: `text-xl font-semibold tracking-tight`
- Meta: `text-xs text-muted-foreground`

## Space and radius

4px base. Shell padding `p-4 md:p-6`. Radius `--radius: 0.375rem`.

## Color

Workspace uses existing CSS variables (`background`, `card`, `border`, `primary`, `destructive`, `--success`, `--warning`, `--info`). Light and dark remain user-selectable; do not force V2-only dark.

## Surfaces

1. App background  
2. Sidebar / top bar (`bg-card` + border)  
3. Main canvas  
4. Inspector (`bg-card` + left border)  
5. Floating (dialog, command)

## Motion

150–200ms color/opacity only. Honor `prefers-reduced-motion`.

## Components

Page header (purpose, primary action, context), tables, charts, tabs, drawers, command palette, `StateView` kinds: loading, empty, error, permission, success, capability.
