const INCIDENTS = [
  {
    ticket: "INC-8492",
    cause: "api.latency > 500ms",
    status: "Investigating",
  },
] as const;

export function IncidentsView() {
  return (
    <div className="h-full overflow-y-auto p-6">
      <header className="mb-6">
        <h1 className="font-mono text-2xl text-text-main">Active Incidents</h1>
      </header>

      <div className="overflow-hidden rounded-md border border-v2-border bg-surface">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-v2-border">
              <th className="px-4 py-4 font-mono text-xs uppercase tracking-wider text-text-muted">
                Ticket
              </th>
              <th className="px-4 py-4 font-mono text-xs uppercase tracking-wider text-text-muted">
                Cause
              </th>
              <th className="px-4 py-4 font-mono text-xs uppercase tracking-wider text-text-muted">
                Status
              </th>
              <th className="px-4 py-4 font-mono text-xs uppercase tracking-wider text-text-muted">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {INCIDENTS.map((incident) => (
              <tr key={incident.ticket} className="border-b border-v2-border last:border-b-0">
                <td className="px-4 py-4 font-mono text-sm text-v2-primary">
                  {incident.ticket}
                </td>
                <td className="px-4 py-4 font-mono text-sm text-text-main">
                  {incident.cause}
                </td>
                <td className="px-4 py-4">
                  <span className="inline-block rounded-md border border-red-800/50 px-2 py-1 font-mono text-xs text-red-400">
                    {incident.status}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <button
                    type="button"
                    className="rounded-md border border-v2-border bg-v2-background px-4 py-2 font-mono text-xs text-text-main transition-colors hover:border-v2-primary hover:text-v2-primary"
                  >
                    View Predict Doc
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
