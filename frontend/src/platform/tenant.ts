/**
 * Tenant context (org + workspace) for Platform Adapter headers.
 * Persisted in localStorage; bootstrapped via ensureTenant().
 */

const ORG_KEY = "spaceforge.organization_id";
const WS_KEY = "spaceforge.workspace_id";

export function getOrganizationId(): string | null {
  try {
    return localStorage.getItem(ORG_KEY);
  } catch {
    return null;
  }
}

export function getWorkspaceId(): string | null {
  try {
    return localStorage.getItem(WS_KEY);
  } catch {
    return null;
  }
}

export function setTenant(organizationId: string, workspaceId: string): void {
  localStorage.setItem(ORG_KEY, organizationId);
  localStorage.setItem(WS_KEY, workspaceId);
}

export function clearTenant(): void {
  localStorage.removeItem(ORG_KEY);
  localStorage.removeItem(WS_KEY);
}
