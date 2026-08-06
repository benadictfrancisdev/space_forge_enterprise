import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StateSize = "sm" | "md" | "lg";

const sizeClass: Record<StateSize, string> = {
  sm: "py-6",
  md: "py-10",
  lg: "py-16",
};

export function PlatformLoadingState({
  label = "Loading…",
  size = "md",
  className,
}: {
  label?: string;
  size?: StateSize;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-2 text-muted-foreground", sizeClass[size], className)}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function PlatformEmptyState({
  title,
  description,
  actionLabel,
  onAction,
  size = "md",
  className,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  size?: StateSize;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 text-center", sizeClass[size], className)}
      role="status"
    >
      <Inbox className="h-8 w-8 text-muted-foreground/60" aria-hidden="true" />
      <div className="space-y-1 max-w-sm">
        <p className="font-medium text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <Button type="button" variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function PlatformErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  size = "md",
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  size?: StateSize;
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3 text-center", sizeClass[size], className)}
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-destructive/80" aria-hidden="true" />
      <div className="space-y-1 max-w-sm">
        <p className="font-medium text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
