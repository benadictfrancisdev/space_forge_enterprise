import { AppShell } from "@/components/enterprise/shell/AppShell";
import { StateView } from "@/components/enterprise/feedback/StateView";

export default function EventSettings() {
  return (
    <AppShell breadcrumbs={[{ label: "Event Engine", to: "/app/events" }, { label: "Settings" }]} title="Workspace Settings">
      <StateView kind="empty" title="Settings coming online" description="Tenant, organization, RBAC, retention, API keys, and webhooks." />
    </AppShell>
  );
}
