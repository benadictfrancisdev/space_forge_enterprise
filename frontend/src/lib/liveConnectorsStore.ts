/**
 * Local-first live connectors store (Track 8.1).
 * Used when VITE_API_BASE_URL is unset. With Django configured, platform routes
 * `live-connectors` to Track 11 Connection registry (`djangoConnectors.ts`).
 */

export interface StoredConnector {
  id: string;
  name: string;
  source_type: string;
  config: Record<string, string>;
  schedule: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string;
  last_error: string | null;
  last_row_count: number;
  is_active: boolean;
  webhook_token: string | null;
  dataset_id: string | null;
  created_at: string;
  user_id: string;
}

const STORAGE_KEY = "spaceforge:live-connectors";

function readAll(): StoredConnector[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(connectors: StoredConnector[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connectors));
  } catch {
    /* quota */
  }
}

function forUser(userId: string) {
  return readAll().filter((c) => c.user_id === userId);
}

export function handleLiveConnectorsInvoke(
  body: Record<string, unknown>
): { success: boolean; data?: unknown; error?: string } {
  const action = String(body.action || "");
  const userId = String(body.userId || body.user_id || "anon");

  switch (action) {
    case "list":
      return { success: true, data: forUser(userId) };

    case "create": {
      const now = new Date().toISOString();
      const connector: StoredConnector = {
        id: crypto.randomUUID(),
        name: String(body.name || "Connector"),
        source_type: String(body.source_type || "rest_api"),
        config: (body.config as Record<string, string>) || {},
        schedule: String(body.schedule || "manual"),
        next_run_at: null,
        last_run_at: null,
        last_status: "idle",
        last_error: null,
        last_row_count: 0,
        is_active: true,
        webhook_token: crypto.randomUUID().slice(0, 12),
        dataset_id: null,
        created_at: now,
        user_id: userId,
      };
      const all = readAll();
      all.unshift(connector);
      writeAll(all);
      return { success: true, data: connector };
    }

    case "delete": {
      const id = String(body.id || "");
      const next = readAll().filter((c) => c.id !== id);
      writeAll(next);
      return { success: true, data: { deleted: true } };
    }

    case "test":
      return {
        success: true,
        data: { rowCount: 42, message: "Connection test succeeded (local preview mode)" },
      };

    case "sync": {
      const id = String(body.id || "");
      const all = readAll();
      const idx = all.findIndex((c) => c.id === id);
      if (idx < 0) return { success: false, error: "Connector not found" };
      const now = new Date().toISOString();
      all[idx] = {
        ...all[idx],
        last_run_at: now,
        last_status: "success",
        last_error: null,
        last_row_count: 128,
      };
      writeAll(all);
      return { success: true, rowCount: 128, datasetId: all[idx].dataset_id || undefined };
    }

    case "load_dataset": {
      const id = String(body.id || "");
      const connector = readAll().find((c) => c.id === id);
      if (!connector) return { success: false, error: "Connector not found" };
      return {
        success: true,
        data: {
          id: connector.id,
          name: `${connector.name} (sync preview)`,
          raw_data: [
            { date: "2026-01-01", value: 100, region: "West" },
            { date: "2026-01-02", value: 120, region: "East" },
            { date: "2026-01-03", value: 115, region: "North" },
          ],
          columns: ["date", "value", "region"],
        },
      };
    }

    case "runs":
      return { success: true, data: [] };

    case "update": {
      const id = String(body.id || "");
      const all = readAll();
      const idx = all.findIndex((c) => c.id === id);
      if (idx < 0) return { success: false, error: "Connector not found" };
      all[idx] = { ...all[idx], ...(body.patch as Partial<StoredConnector>) };
      writeAll(all);
      return { success: true, data: all[idx] };
    }

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}
