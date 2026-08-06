import { AppShell } from "@/components/enterprise/shell/AppShell";
import { StateView } from "@/components/enterprise/feedback/StateView";

export default function EventSearch() {
  return (
    <AppShell breadcrumbs={[{ label: "Event Engine", to: "/app/events" }, { label: "Search" }]} title="Event Search">
      <StateView kind="empty" title="Search everything" description="Natural language, filter DSL, and semantic search across all events. Available after ingestion." />
    </AppShell>
  );
}
