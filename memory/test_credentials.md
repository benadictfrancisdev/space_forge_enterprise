# Test Credentials — SpaceForge

## Auth model
Frontend auth = Firebase (email/password) → dev bridge → Django JWT via
`POST /api/v1/auth/exchange {"token":"dev:<uid>:<email>"}`.

### UI login (frontend)
- Firebase **email/password signup works** from the preview. Create any account on `/auth` → "Sign Up".
  - Example: `qa.user@spaceforge.test` / `Passw0rd!23` (create fresh; Firebase project spaceforge-69fc6).
- Google sign-in will fail unless the preview domain is added to Firebase Authorized Domains.
- Onboarding overlay: set `localStorage['onboarding-completed'] = 'true'` to bypass in automation.

### Backend-only (curl) — no Firebase needed (AUTH_MODE=dev)
```
POST /api/v1/auth/exchange/   body: {"token":"dev:u-qa-1:qa@spaceforge.local"}
# returns access_token; then send:
#   Authorization: Bearer <access_token>
#   X-Organization-ID: <org id>   X-Workspace-ID: <ws id>
```
Create org: `POST /api/v1/organizations/ {"name":"QA"}`
Create ws:  `POST /api/v1/workspaces/ {"organization_id":"<org>","name":"Default"}`

Backend runs in **lite** mode (SQLite `backend/lite_db.sqlite3`, in-memory storage, eager Celery).
