# Sprint 3 — Functional Completion

**Goal:** Every shipped Enterprise Suite feature works end-to-end with real platform data — not stubs.

## Golden path

1. Sign in (Firebase → dev bearer when `AUTH_MODE=dev`)
2. Upload CSV in **Data Agent** → auto pipeline on platform dataset
3. Open **Executive Insights** (`/apps/executive?dataset=…`)
4. Run **Golden Path** or **Prepare & Analyze** → insight bundle
5. **Decision Intelligence** → analyze problem with reasoning chain
6. **Reporting** → generate executive report (markdown + HTML)

## Certification

```bash
npm run dev:backend:lite   # Django :8000
npm run validate:sprint3   # pytest golden path
npm run validate:track13   # full Track 13 matrix (11 tests)
```

## Local UI

```bash
# .env
VITE_API_BASE_URL=http://localhost:8000

npm run dev
```

Open: `http://localhost:5173/apps/executive` after sign-in.

## Wiring completed in Sprint 3

| Legacy invoke | Django API |
|---------------|------------|
| `db-connect` | `/api/v1/connectors/test/`, `/api/v1/connections/` |
| `fetch-connector-data` | Draft test + client fetch (csv/json) + connection sync |
| `live-connectors` | (Track 11 — already wired) |
| Upload + pipeline | `uploadAndRegisterDataset` + `prepareDataset` |

## Out of scope (frozen)

- Track 14 Collaboration
- Track 15 Developer Platform
- Playwright browser E2E (planned follow-up)
- Native PDF/PPTX export

## Feature matrix

See [FEATURE-COMPLETION-MATRIX.md](./FEATURE-COMPLETION-MATRIX.md).
