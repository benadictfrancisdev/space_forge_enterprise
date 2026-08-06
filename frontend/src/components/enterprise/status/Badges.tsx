import { cn } from "@/lib/utils";

type Severity = "info" | "warn" | "error" | "critical";
type Status = "pending" | "processing" | "processed" | "failed" | "skipped" | "connected" | "degraded" | "disconnected" | "error";

const SEV: Record<Severity, string> = {
  info: "bg-muted text-muted-foreground border-border",
  warn: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
  critical: "bg-destructive text-destructive-foreground border-destructive",
};

const STAT: Record<string, string> = {
  processed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  connected: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  processing: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30",
  pending: "bg-muted text-muted-foreground border-border",
  failed: "bg-destructive/10 text-destructive border-destructive/30",
  error: "bg-destructive/10 text-destructive border-destructive/30",
  degraded: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  skipped: "bg-muted text-muted-foreground border-border",
  disconnected: "bg-muted text-muted-foreground border-border",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide", SEV[severity])}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase tracking-wide", STAT[status] ?? STAT.pending)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
