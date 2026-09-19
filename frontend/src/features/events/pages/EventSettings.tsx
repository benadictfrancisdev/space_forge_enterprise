import { AppShell } from "@/components/enterprise/shell/AppShell";
import { workspacePath } from "@/config/workspaceNav";
import { StateView } from "@/components/enterprise/feedback/StateView";

export default function EventSettings() {
  return (
    <AppShell breadcrumbs={[{ label: "Event Engine", to: workspacePath("/events") }, { label: "Settings" }]} title="Workspace Settings">
      <StateView
        kind="capability"
        title="Administration surfaces are not in this view yet"
        description="Organization, workspace, and sign-in live in the workspace shell. RBAC, retention, API keys, and webhooks are not exposed by this UI."
      />
    </AppShell>
  );
}
