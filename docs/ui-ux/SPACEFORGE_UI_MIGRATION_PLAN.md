# SpaceForge UI migration plan

Constraints: no backend rewrite, no fake data, no route mass-rename, keep Firebase + Django.

| Phase | Status |
|---|---|
| A Information architecture | In this change (`workspaceNav`) |
| B Design tokens | Shell tokens in `index.css` |
| C Application shell | `AppLayout` top bar + inspector |
| D Navigation | Domain groups; Event Engine nested |
| E Command palette | Cmd/Ctrl+K |
| F Home | Attention-first control center |
| G–Q | Later (Decision workspace, incident split, Data Agent views, IDE chrome, Journey merge, reports, admin, mobile polish, a11y pass, performance, regression) |

Backward compatibility: `LegacyPathRedirect` stays. `/v2` paths stay. `EVENT_ENGINE_NAV` remains for Event page frames.
