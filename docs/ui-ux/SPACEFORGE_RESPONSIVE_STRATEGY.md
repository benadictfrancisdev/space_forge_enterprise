# SpaceForge responsive strategy

## Breakpoints

Existing Tailwind: `xs` 360, `sm` 640, `md` 768, `lg` 1024, `xl` 1280.

## Desktop (≥1024)

Sidebar + main + optional inspector.

## Tablet (768–1023)

Icon rail or overlay nav; inspector as sheet.

## Mobile (<768)

Bottom domain nav. No squeezed three-pane IDE. Monaco: message + read-only fallback in a later phase; do not ship a broken editor as the only path.

## Critical mobile flows

Login, home, decision review, incident review, metrics, reports, notifications (when they exist), Ask SpaceForge (inspector / command).
