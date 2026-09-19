import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/enterprise/shell/AppShell";
import { MetricCard } from "@/components/enterprise/metrics/MetricCard";
import { StateView } from "@/components/enterprise/feedback/StateView";
import { fetchEventStats, ingestSampleEvents } from "@/features/events/api/eventsApi";
import { workspacePath } from "@/config/workspaceNav";
import { Activity, Database, Zap, AlertTriangle, Gauge, Plug, Clock, HardDrive, ShieldCheck, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function EventsDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const enabled = !!user;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["events-stats", user?.id],
    queryFn: fetchEventStats,
    enabled,
    staleTime: 30_000,
  });

  const seed = useMutation({
    mutationFn: () => ingestSampleEvents(50),
    onSuccess: (n) => {
      toast({ title: "Sample events ingested", description: `${n} events added to your event stream.` });
      qc.invalidateQueries({ queryKey: ["events-stats"] });
    },
    onError: (e: Error) => toast({ title: "Ingest failed", description: e.message, variant: "destructive" }),
  });

  return (
    <AppShell
      breadcrumbs={[{ label: "Event Engine", to: workspacePath("/events") }, { label: "Dashboard" }]}
      title="Universal Event Engine"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Refresh</Button>
          <Button size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>
            {seed.isPending ? "Seeding…" : "Generate sample events"}
          </Button>
        </>
      }
    >
      {!user && (
        <StateView
          kind="permission"
          title="Sign in required"
          description="The Event Engine is scoped to your workspace. Please sign in to view your organization's events."
        />
      )}
      {user && isError && (
        <StateView kind="error" title="Could not load stats" description={(error as Error)?.message} />
      )}
      {user && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          <MetricCard label="Total Events" value={fmt(data?.totalEvents)} loading={isLoading} icon={<Database className="h-4 w-4" />} />
          <MetricCard label="Today" value={fmt(data?.eventsToday)} loading={isLoading} icon={<Activity className="h-4 w-4" />} />
          <MetricCard label="Events / min" value={fmt(data?.eventsPerMinute)} loading={isLoading} icon={<Zap className="h-4 w-4" />} />
          <MetricCard label="Connected Sources" value={`${data?.connectedSources ?? 0}/${data?.totalSources ?? 0}`} loading={isLoading} icon={<Plug className="h-4 w-4" />} />
          <MetricCard label="Data Quality" value={`${data?.dataQuality ?? 100}%`} loading={isLoading} icon={<ShieldCheck className="h-4 w-4" />} />
          <MetricCard label="Failed (24h)" value={fmt(data?.failedEvents24h)} loading={isLoading} icon={<AlertTriangle className="h-4 w-4" />} />
          <MetricCard label="Active Streams" value={fmt(data?.activeStreams)} loading={isLoading} icon={<Waves className="h-4 w-4" />} />
          <MetricCard label="Storage" value={data?.storageBytes ? `${(data.storageBytes / 1e9).toFixed(1)} GB` : "—"} loading={isLoading} icon={<HardDrive className="h-4 w-4" />} />
          <MetricCard label="Avg Processing" value={data?.avgProcessingMs ? `${data.avgProcessingMs} ms` : "—"} loading={isLoading} icon={<Clock className="h-4 w-4" />} />
          <MetricCard label="Health Score" value={`${data?.healthScore ?? 100}`} loading={isLoading} icon={<Gauge className="h-4 w-4" />} />
        </div>
      )}

      {user && !isLoading && (data?.totalEvents ?? 0) === 0 && (
        <div className="mt-6">
          <StateView
            kind="empty"
            title="No events yet"
            description="Ingest events from your ERP, CRM, POS, IoT devices, or APIs. Start by generating sample events or connect a data source."
            action={
              <div className="flex gap-2 justify-center">
                <Button size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>Generate sample events</Button>
                <Button size="sm" variant="outline" asChild><a href={workspacePath("/events/sources")}>Connect a source</a></Button>
              </div>
            }
          />
        </div>
      )}
    </AppShell>
  );
}

const fmt = (n?: number) => (n == null ? "—" : n.toLocaleString());
