import { useCallback, useEffect, useState } from "react";
import { djangoApi, type Organization, type Workspace } from "@/platform/djangoAdapter";
import { getOrganizationId, getWorkspaceId, setTenant } from "@/platform/tenant";
import { usePlatformBootstrap } from "@/hooks/usePlatformBootstrap";
import { useAuth } from "@/hooks/useAuth";

export function useTenantContext() {
  const { user } = useAuth();
  const bootstrap = usePlatformBootstrap();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);

  const refresh = useCallback(async () => {
    if (!bootstrap.apiConfigured || !user || !bootstrap.ready) {
      setOrganizations([]);
      setWorkspaces([]);
      setOrganization(null);
      setWorkspace(null);
      return;
    }
    const orgsResult = await djangoApi.listOrganizations();
    const orgs = orgsResult.data ?? [];
    setOrganizations(orgs);
    const orgId = getOrganizationId();
    const org = orgs.find((o) => o.id === orgId) ?? orgs[0] ?? null;
    setOrganization(org ?? null);
    if (!org) {
      setWorkspaces([]);
      setWorkspace(null);
      return;
    }
    const wsResult = await djangoApi.listWorkspaces(org.id);
    const list = wsResult.data ?? [];
    setWorkspaces(list);
    const wsId = getWorkspaceId();
    setWorkspace(list.find((w) => w.id === wsId) ?? list[0] ?? null);
  }, [bootstrap.apiConfigured, bootstrap.ready, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectOrganization = async (organizationId: string) => {
    const wsResult = await djangoApi.listWorkspaces(organizationId);
    const list = wsResult.data ?? [];
    const nextWs = list[0];
    if (!nextWs) return;
    setTenant(organizationId, nextWs.id);
    await refresh();
  };

  const selectWorkspace = async (workspaceId: string) => {
    const orgId = organization?.id ?? getOrganizationId();
    if (!orgId) return;
    setTenant(orgId, workspaceId);
    await refresh();
  };

  return {
    ...bootstrap,
    user,
    organizations,
    workspaces,
    organization,
    workspace,
    selectOrganization,
    selectWorkspace,
    refresh,
  };
}
