import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/enterprise/shell/AppShell";
import { StateView } from "@/components/enterprise/feedback/StateView";
import { StatusBadge, SeverityBadge } from "@/components/enterprise/status/Badges";
import { backend } from "@/platform";

export default function EventDetails() {
  const { eventId } = useParams();
  const { user } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["event", eventId],
    enabled: !!user && !!eventId,
    queryFn: async () => {
      const { data, error } = await backend.from("events").select("*").eq("id", eventId!).maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });

  const evt = data as any;

  return (
    <AppShell
      breadcrumbs={[
        { label: "Event Engine", to: "/app/events" },
        { label: "Explorer", to: "/app/events/explorer" },
        { label: eventId?.slice(0, 8) ?? "Event" },
      ]}
      title="Event Details"
    >
      {!user && <StateView kind="permission" title="Sign in required" />}
      {user && isLoading && <StateView kind="loading" title="Loading eventâ€¦" />}
      {user && isError && <StateView kind="error" title="Failed to load" description={(error as Error)?.message} />}
      {user && !isLoading && !evt && <StateView kind="empty" title="Event not found" description="It may have been deleted or you don't have access." action={<Link to="/app/events/explorer" className="text-sm underline">Back to Explorer</Link>} />}

      {evt && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <Section title="Overview">
              <Grid>
                <Field label="Event Type">{evt.event_type_key}</Field>
                <Field label="Status"><StatusBadge status={evt.status} /></Field>
                <Field label="Severity"><SeverityBadge severity={evt.severity} /></Field>
                <Field label="Confidence">{evt.confidence ?? "â€”"}</Field>
                <Field label="Occurred">{new Date(evt.occurred_at).toLocaleString()}</Field>
                <Field label="Ingested">{new Date(evt.ingested_at).toLocaleString()}</Field>
              </Grid>
            </Section>

            <Section title="Business Context">
              <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto">{JSON.stringify(evt.business_context, null, 2)}</pre>
            </Section>

            <Section title="Metadata">
              <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto">{JSON.stringify(evt.metadata, null, 2)}</pre>
            </Section>

            <Section title="Actor">
              <pre className="text-xs bg-muted/50 p-3 rounded-md overflow-x-auto">{JSON.stringify(evt.actor, null, 2)}</pre>
            </Section>
          </div>

          <div className="space-y-4">
            <Section title="Identifiers">
              <Field label="Event ID"><span className="font-mono text-xs break-all">{evt.id}</span></Field>
              <Field label="Correlation"><span className="font-mono text-xs break-all">{evt.correlation_id ?? "â€”"}</span></Field>
              <Field label="Parent Event"><span className="font-mono text-xs break-all">{evt.parent_event_id ?? "â€”"}</span></Field>
              <Field label="Entity"><span className="font-mono text-xs break-all">{evt.entity_id ?? "â€”"}</span></Field>
              <Field label="Source"><span className="font-mono text-xs break-all">{evt.source_id ?? "â€”"}</span></Field>
            </Section>

            <Section title="Processing History">
              <StateView kind="empty" title="No history yet" description="Processing stages will appear here as pipelines run." />
            </Section>

            <Section title="Related Events">
              <StateView kind="empty" title="No related events" description="Correlated events will surface here." />
            </Section>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card">
      <div className="px-4 py-3 border-b border-border/60">
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4 space-y-2">{children}</div>
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm mt-0.5">{children}</div>
    </div>
  );
}
