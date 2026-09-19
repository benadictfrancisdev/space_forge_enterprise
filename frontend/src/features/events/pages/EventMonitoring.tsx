import { AppShell } from "@/components/enterprise/shell/AppShell";
import { workspacePath } from "@/config/workspaceNav";
import { StateView } from "@/components/enterprise/feedback/StateView";

export default function EventMonitoring() {
  return (
    <AppShell breadcrumbs={[{ label: "Event Engine", to: workspacePath("/events") }, { label: "Monitoring" }]} title="Real-time Monitoring">
      <StateView kind="empty" title="No live streams" description="Live activity, alerts, and failures will appear here as events flow in." />
    </AppShell>
  );
}
