import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { inspectorCopyForPath } from "@/config/workspaceNav";
import { Button } from "@/components/ui/button";

type InspectorOverride = { title: string; body: ReactNode } | null;

type InspectorContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  setOverride: (value: InspectorOverride) => void;
  override: InspectorOverride;
};

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function useWorkspaceInspector() {
  const ctx = useContext(InspectorContext);
  if (!ctx) {
    return {
      open: false,
      setOpen: (_: boolean) => undefined,
      setOverride: (_: InspectorOverride) => undefined,
      override: null as InspectorOverride,
    };
  }
  return ctx;
}

export function WorkspaceInspectorProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true);
  const [override, setOverride] = useState<InspectorOverride>(null);
  const value = useMemo(() => ({ open, setOpen, setOverride, override }), [open, override]);
  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function WorkspaceInspectorPanel() {
  const { pathname } = useLocation();
  const { open, setOpen, override } = useWorkspaceInspector();
  const fallback = inspectorCopyForPath(pathname);
  const title = override?.title ?? fallback.title;
  const body = override?.body ?? fallback.body;

  if (!open) return null;

  return (
    <aside
      className="hidden xl:flex w-[300px] shrink-0 flex-col border-l border-border bg-card min-h-0"
      aria-label="Context inspector"
    >
      <div className="h-12 flex items-center justify-between px-4 border-b border-border shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(false)}>
          Hide
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm text-muted-foreground leading-relaxed">{body}</div>
      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        Ask SpaceForge from the command palette (Ctrl/Cmd+K). Context follows the current workspace view.
      </div>
    </aside>
  );
}
