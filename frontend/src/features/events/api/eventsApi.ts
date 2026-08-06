import { backend } from "@/platform";

export interface EventStats {
  workspace: { tenantId: string; orgId: string };
  totalEvents: number;
  eventsToday: number;
  eventsPerMinute: number;
  connectedSources: number;
  totalSources: number;
  failedEvents24h: number;
  activeStreams: number;
  healthScore: number;
  dataQuality: number;
  avgProcessingMs: number | null;
  storageBytes: number | null;
}

export interface EventRow {
  id: string;
  occurred_at: string;
  ingested_at: string;
  event_type_key: string;
  status: "pending" | "processing" | "processed" | "failed" | "skipped";
  severity: "info" | "warn" | "error" | "critical";
  source_id: string | null;
  entity_id: string | null;
  correlation_id: string | null;
  actor: Record<string, unknown>;
  business_context: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface EventsQueryFilters {
  status?: string[];
  severity?: string[];
  sourceIds?: string[];
  typeKeys?: string[];
  search?: string;
  from?: string;
  to?: string;
}

export interface EventsQueryResult {
  rows: EventRow[];
  nextCursor: { occurred_at: string; id: string } | null;
  hasMore: boolean;
}

export async function fetchEventStats(): Promise<EventStats | null> {
  const { data, error } = await backend.functions.invoke("events-stats", { body: {} });
  if (error) throw error;
  const payload = data as { success: boolean; data?: EventStats; error?: string };
  if (!payload?.success) throw new Error(payload?.error ?? "events-stats failed");
  return payload.data ?? null;
}

export async function queryEvents(params: {
  orgId?: string;
  filters?: EventsQueryFilters;
  cursor?: { occurred_at: string; id: string } | null;
  limit?: number;
}): Promise<EventsQueryResult> {
  const { data, error } = await backend.functions.invoke("events-query", { body: params });
  if (error) throw error;
  const payload = data as { success: boolean; data?: EventsQueryResult; error?: string };
  if (!payload?.success) throw new Error(payload?.error ?? "events-query failed");
  return payload.data ?? { rows: [], nextCursor: null, hasMore: false };
}

export async function ingestSampleEvents(count = 25): Promise<number> {
  const types = ["order.created", "invoice.paid", "customer.signup", "ticket.opened", "payment.failed", "inventory.low"];
  const severities = ["info", "info", "info", "warn", "error", "critical"];
  const statuses = ["processed", "processed", "processed", "processed", "failed", "pending"];
  const events = Array.from({ length: count }).map(() => {
    const i = Math.floor(Math.random() * types.length);
    return {
      event_type_key: types[i],
      severity: severities[Math.min(i, severities.length - 1)],
      status: statuses[Math.min(i, statuses.length - 1)],
      actor: { type: "system", name: "sample-generator" },
      metadata: { amount: Math.round(Math.random() * 10000), currency: "USD" },
      business_context: { channel: "web" },
      occurred_at: new Date(Date.now() - Math.random() * 86400_000).toISOString(),
    };
  });
  const { data, error } = await backend.functions.invoke("events-ingest", { body: { events } });
  if (error) throw error;
  const payload = data as { success: boolean; data?: { inserted: number } };
  return payload.data?.inserted ?? 0;
}
