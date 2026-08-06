import { AppShell } from "@/components/enterprise/shell/AppShell";
import { StateView } from "@/components/enterprise/feedback/StateView";

export default function EventAnalytics() {
  return (
    <AppShell breadcrumbs={[{ label: "Event Engine", to: "/app/events" }, { label: "Analytics" }]} title="Event Analytics">
      <StateView kind="empty" title="Analytics unlock with data" description="Events by source, type, and time · latency percentiles · error distribution · business activity trends." />
    </AppShell>
  );
}
