import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Loader2, AlertCircle, Inbox, Lock, CheckCircle2, CircleDashed } from "lucide-react";

type Kind = "empty" | "loading" | "error" | "permission" | "success" | "capability";

interface StateViewProps {
  kind: Kind;
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

const ICONS: Record<Kind, typeof Inbox> = {
  empty: Inbox,
  loading: Loader2,
  error: AlertCircle,
  permission: Lock,
  success: CheckCircle2,
  capability: CircleDashed,
};

export function StateView({ kind, title, description, icon, action, className }: StateViewProps) {
  const Icon = ICONS[kind];
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 rounded-xl border border-dashed border-border/70 bg-card/30",
        className
      )}
    >
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center mb-4 bg-muted text-muted-foreground",
        kind === "error" && "bg-destructive/10 text-destructive"
      )}>
        {icon ?? <Icon className={cn("h-5 w-5", kind === "loading" && "animate-spin")} />}
      </div>
      {title && <h3 className="text-base font-semibold text-foreground">{title}</h3>}
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-md">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
