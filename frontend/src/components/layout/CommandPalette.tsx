import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { flattenNavItems, WORKSPACE_NAV_GROUPS } from "@/config/workspaceNav";
import { platformClient } from "@/platform/track13/platformClient";
import { isApiConfigured } from "@/platform";
import { useAuth } from "@/hooks/useAuth";

type SearchHit = { id: string; title: string; resource_type: string };

function resourcePath(hit: SearchHit): string | null {
  const type = hit.resource_type.toLowerCase();
  if (type.includes("incident")) return `/v2/incidents`;
  if (type.includes("decision")) return `/v2/apps/decisions`;
  if (type.includes("dataset")) return `/v2/data-agent`;
  if (type.includes("report")) return `/v2/apps/reporting`;
  if (type.includes("event")) return `/v2/events`;
  if (type.includes("metric")) return `/v2/metrics`;
  if (type.includes("journey")) return `/v2/apps/journey`;
  return null;
}

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const navItems = useMemo(() => flattenNavItems(WORKSPACE_NAV_GROUPS), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setHits([]);
    }
  }, [open]);

  const runSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      if (!q.trim() || !isApiConfigured() || !user) {
        setHits([]);
        return;
      }
      setSearching(true);
      try {
        const raw = await platformClient.enterpriseSearch(q.trim());
        setHits(
          raw.map((r) => ({
            id: String(r.id ?? r.title ?? Math.random()),
            title: String(r.title ?? r.name ?? "Result"),
            resource_type: String(r.resource_type ?? r.type ?? "record"),
          }))
        );
      } catch {
        setHits([]);
      } finally {
        setSearching(false);
      }
    },
    [user]
  );

  const go = (to: string) => {
    onOpenChange(false);
    navigate(to);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search datasets, decisions, incidents, reports…"
        value={query}
        onValueChange={(v) => void runSearch(v)}
      />
      <CommandList>
        <CommandEmpty>{searching ? "Searching…" : "No matching navigation or records."}</CommandEmpty>
        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem
              key={`${item.label}-${item.to}`}
              value={`${item.label} ${item.to}`}
              onSelect={() => go(item.to)}
            >
              <item.icon className="mr-2 h-4 w-4 shrink-0" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {hits.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Workspace">
              {hits.slice(0, 12).map((hit) => (
                <CommandItem
                  key={hit.id}
                  value={`${hit.title} ${hit.resource_type}`}
                  onSelect={() => go(resourcePath(hit) ?? "/v2")}
                >
                  <span className="truncate">{hit.title}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                    {hit.resource_type}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
