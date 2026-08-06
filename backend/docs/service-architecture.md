# Service Architecture

| Service | Location | Purpose |
|---------|----------|---------|
| AuthService | identity | Verify bearer, upsert user, issue JWT |
| OrganizationService | organizations | Create/list/update orgs |
| WorkspaceService | workspaces | Create/list/get workspaces |
| PermissionService | permissions | RBAC has/require |
| StorageService | storage | Upload + list objects (S3) |
| DatasetService | datasets | Metadata CRUD foundation |
| JobService | jobs | Enqueue + status transitions |
| NotificationService | notifications | Create/list notifications |
| EventService | events | Outbox publish |
| AuditService | audit | Append-only audit records |
| ObjectStorageClient | storage | S3/MinIO adapter |

Future AI/analytics modules must consume these services rather than reaching into ORM tables ad hoc.
