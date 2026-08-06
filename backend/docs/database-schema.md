# Database Schema (Phase 0.1)

## Conventions

- UUID PKs
- Soft deletes (`deleted_at`) on domain entities
- `created_at` / `updated_at`
- Tenant column `organization_id` on tenant-scoped tables
- Audit actor FKs where applicable

## Tables

- `identity_users`
- `organizations`
- `workspaces` (unique slug per org among alive rows)
- `memberships` (org-level and workspace-level)
- `permissions`, `roles`, `role_permissions`
- `storage_objects`
- `datasets` (metadata + version)
- `notifications`
- `jobs`
- `outbox_events`
- `audit_logs`
- `billing_plans`, `billing_accounts`

Migrations are generated under each app's `migrations/` package.
