const METRIC_CARDS = [
  { label: "API Latency", value: "P99: 142ms" },
  { label: "DB Write Locks", value: "Count: 0" },
  { label: "Stripe Webhooks", value: "Processed: 1,042" },
] as const;

export function MetricsView() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <header className="mb-6">
        <h1 className="font-mono text-2xl text-text-main">System Telemetry</h1>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {METRIC_CARDS.map((card) => (
          <article
            key={card.label}
            className="rounded-md border border-v2-border bg-surface p-4"
          >
            <h2 className="font-mono text-xs uppercase tracking-wider text-text-muted">
              {card.label}
            </h2>
            <p className="mt-4 font-mono text-2xl text-text-main">{card.value}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
