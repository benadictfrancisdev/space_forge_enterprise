import { AppShell } from "@/components/enterprise/shell/AppShell";
import { workspacePath } from "@/config/workspaceNav";
import { StateView } from "@/components/enterprise/feedback/StateView";
import { Plug } from "lucide-react";

const KINDS = [
  { kind: "erp", name: "ERP" },
  { kind: "crm", name: "CRM" },
  { kind: "finance", name: "Finance" },
  { kind: "hrms", name: "HRMS" },
  { kind: "pos", name: "POS" },
  { kind: "marketing", name: "Marketing" },
  { kind: "iot", name: "IoT" },
  { kind: "api", name: "API" },
  { kind: "csv", name: "CSV" },
  { kind: "excel", name: "Excel" },
  { kind: "sql", name: "SQL" },
  { kind: "mongodb", name: "MongoDB" },
  { kind: "postgres", name: "PostgreSQL" },
  { kind: "webhook", name: "Webhook" },
];

export default function EventSources() {
  return (
    <AppShell
      breadcrumbs={[{ label: "Event Engine", to: workspacePath("/events") }, { label: "Data Sources" }]}
      title="Data Sources"
    >
      <StateView
        kind="empty"
        title="No sources connected yet"
        description="Connect your business systems to start streaming events into the Universal Event Engine."
      />
      <h2 className="mt-6 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available connector types</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2">
        {KINDS.map((k) => (
          <div key={k.kind} className="rounded-lg border border-border/70 bg-card p-3 flex items-center gap-2">
            <Plug className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{k.name}</span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
