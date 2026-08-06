import { useState, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/enterprise/shell/AppShell";
import { StateView } from "@/components/enterprise/feedback/StateView";
import { StatusBadge, SeverityBadge } from "@/components/enterprise/status/Badges";
import { queryEvents, type EventsQueryFilters, type EventRow } from "@/features/events/api/eventsApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

const STATUSES = ["pending", "processing", "processed", "failed", "skipped"] as const;
const SEVS = ["info", "warn", "error", "critical"] as const;

export default function EventsExplorer() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [severity, setSeverity] = useState<string[]>([]);

  const filters: EventsQueryFilters = useMemo(
    () => ({ search: search || undefined, status, severity }),
    [search, status, severity],
  );

  const q = useInfiniteQuery({
    queryKey: ["events-explorer", user?.id, filters],
    initialPageParam: null as { occurred_at: string; id: string } | null,
    queryFn: ({ pageParam }) => queryEvents({ filters, cursor: pageParam, limit: 50 }),
    getNextPageParam: (last) => last.nextCursor,
    enabled: !!user,
  });

  const rows: EventRow[] = q.data?.pages.flatMap((p) => p.rows) ?? [];

  return (
    <AppShell
      breadcrumbs={[{ label: "Event Engine", to: "/app/events" }, { label: "Event Explorer" }]}
      title="Event Explorer"
      actions={<span className="text-xs text-muted-foreground tabular-nums">{rows.length.toLocaleString()} loaded</span>}
    >
      <div className="rounded-xl border border-border/70 bg-card mb-4">
        <div className="p-3 border-b border-border/60 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by event type…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Toggles label="Status" options={STATUSES as unknown as string[]} value={status} onChange={setStatus} />
          <Toggles label="Severity" options={SEVS as unknown as string[]} value={severity} onChange={setSeverity} />
        </div>

        {!user && <div className="p-4"><StateView kind="permission" title="Sign in required" /></div>}
        {user && q.isLoading && <div className="p-4"><StateView kind="loading" title="Loading events…" /></div>}
        {user && q.isError && <div className="p-4"><StateView kind="error" title="Query failed" description={(q.error as Error)?.message} /></div>}
        {user && !q.isLoading && rows.length === 0 && (
          <div className="p-4">
            <StateView kind="empty" title="No events match your filters" description="Adjust the filters or ingest new events." />
          </div>
        )}

        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground uppercase tracking-wide bg-muted/40">
                <tr>
                  <th className="text-left font-medium px-3 py-2">Occurred</th>
                  <th className="text-left font-medium px-3 py-2">Event Type</th>
                  <th className="text-left font-medium px-3 py-2">Status</th>
                  <th className="text-left font-medium px-3 py-2">Severity</th>
                  <th className="text-left font-medium px-3 py-2">Correlation</th>
                  <th className="text-right font-medium px-3 py-2 pr-4">ID</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border/50 hover:bg-muted/40">
                    <td className="px-3 py-2 tabular-nums text-muted-foreground">{new Date(r.occurred_at).toLocaleString()}</td>
                    <td className="px-3 py-2 font-medium">{r.event_type_key}</td>
                    <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                    <td className="px-3 py-2"><SeverityBadge severity={r.severity} /></td>
                    <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{r.correlation_id?.slice(0, 8) ?? "—"}</td>
                    <td className="px-3 py-2 pr-4 text-right">
                      <Link
                        to={`/app/events/explorer/${r.id}`}
                        className="text-xs font-mono text-muted-foreground hover:text-foreground"
                      >
                        {r.id.slice(0, 8)}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {q.hasNextPage && (
          <div className="p-3 border-t border-border/60 flex justify-center">
            <Button size="sm" variant="outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
              {q.isFetchingNextPage ? "Loading…" : "Load more"}
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Toggles({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground mr-1">{label}</span>
      {options.map((o) => {
        const active = value.includes(o);
        return (
          <button
            key={o}
            onClick={() => onChange(active ? value.filter((v) => v !== o) : [...value, o])}
            className={
              "h-7 px-2 rounded-md text-xs border transition-colors " +
              (active
                ? "bg-foreground text-background border-foreground"
                : "border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted")
            }
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
