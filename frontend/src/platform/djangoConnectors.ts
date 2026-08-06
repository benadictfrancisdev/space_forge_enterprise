/**
 * Track 11.3 — Live Connectors backed by Django Connection registry.
 * Maps the UI action protocol onto /api/v1/connections/ + /api/v1/connectors/.
 */

import { djangoApi, type ConnectionRecord } from "./djangoAdapter";
import type { StoredConnector } from "@/lib/liveConnectorsStore";

function healthToLastStatus(health: string): string {
  switch (health) {
    case "healthy":
      return "success";
    case "unhealthy":
      return "failed";
    case "testing":
      return "running";
    default:
      return "idle";
  }
}

function toUiConnector(conn: ConnectionRecord): StoredConnector {
  const config = (conn.config || {}) as Record<string, string>;
  return {
    id: conn.id,
    name: conn.name,
    source_type: conn.connector_type,
    config,
    schedule: conn.sync_schedule || "manual",
    next_run_at: conn.next_sync_at,
    last_run_at: conn.last_sync_at,
    last_status: conn.last_sync_at
      ? conn.health_status === "unhealthy"
        ? "failed"
        : "success"
      : healthToLastStatus(conn.health_status),
    last_error:
      conn.health_status === "unhealthy" ? conn.last_health_message || null : null,
    last_row_count: 0,
    is_active: conn.is_active,
    webhook_token: config.webhook_token || null,
    dataset_id: conn.target_dataset_id,
    created_at: conn.created_at,
    user_id: conn.owner_id || "",
  };
}

export async function handleDjangoLiveConnectorsInvoke(
  body: Record<string, unknown>
): Promise<{ success: boolean; data?: unknown; error?: string; rowCount?: number }> {
  const action = String(body.action || "");

  try {
    switch (action) {
      case "list": {
        const listed = await djangoApi.listConnections();
        if (listed.error) return { success: false, error: listed.error.message };
        return {
          success: true,
          data: (listed.data || []).map(toUiConnector),
        };
      }

      case "create": {
        const created = await djangoApi.createConnection({
          name: String(body.name || "Connector"),
          connectorType: String(body.source_type || "platform.echo"),
          config: (body.config as Record<string, unknown>) || {},
          secrets: (body.secrets as Record<string, unknown>) || undefined,
          syncSchedule: String(body.schedule || "manual"),
        });
        if (created.error || !created.data) {
          return { success: false, error: created.error?.message || "Create failed" };
        }
        return { success: true, data: toUiConnector(created.data) };
      }

      case "update": {
        const id = String(body.id || "");
        if (!id) return { success: false, error: "id is required" };
        const updated = await djangoApi.updateConnection(id, {
          name: body.name != null ? String(body.name) : undefined,
          config: (body.config as Record<string, unknown>) || undefined,
          syncSchedule: body.schedule != null ? String(body.schedule) : undefined,
          secrets: (body.secrets as Record<string, unknown>) || undefined,
        });
        if (updated.error || !updated.data) {
          return { success: false, error: updated.error?.message || "Update failed" };
        }
        return { success: true, data: toUiConnector(updated.data) };
      }

      case "delete": {
        const id = String(body.id || "");
        if (!id) return { success: false, error: "id is required" };
        const deleted = await djangoApi.deleteConnection(id);
        if (deleted.error) return { success: false, error: deleted.error.message };
        return { success: true, data: { deleted: true } };
      }

      case "test": {
        // Draft test (before save) or saved connection test
        const connectionId = body.id ? String(body.id) : "";
        if (connectionId) {
          const tested = await djangoApi.testConnection(connectionId);
          if (tested.error || !tested.data) {
            return { success: false, error: tested.error?.message || "Test failed" };
          }
          const ok = tested.data.connection.health_status === "healthy";
          return {
            success: ok,
            data: {
              rowCount: 0,
              message: tested.data.connection.last_health_message,
              health_status: tested.data.connection.health_status,
              job_id: tested.data.job.id,
            },
            error: ok ? undefined : tested.data.connection.last_health_message,
            rowCount: 0,
          };
        }
        const draft = await djangoApi.testConnectorDraft({
          connectorType: String(body.source_type || "platform.echo"),
          config: (body.config as Record<string, unknown>) || {},
          credentials: (body.secrets as Record<string, unknown>) || {},
        });
        if (draft.error || !draft.data) {
          return { success: false, error: draft.error?.message || "Test failed" };
        }
        return {
          success: draft.data.ok,
          data: {
            rowCount: draft.data.rowCount ?? 0,
            message: draft.data.message,
          },
          error: draft.data.ok ? undefined : draft.data.message,
          rowCount: draft.data.rowCount ?? 0,
        };
      }

      case "sync": {
        const id = String(body.id || "");
        if (!id) return { success: false, error: "id is required" };
        const synced = await djangoApi.syncConnection(id, {
          mode: body.mode === "incremental" ? "incremental" : "full",
        });
        if (synced.error || !synced.data) {
          return { success: false, error: synced.error?.message || "Sync failed" };
        }
        const rows = synced.data.sync_run.rows_loaded ?? 0;
        return {
          success: true,
          data: {
            rowCount: rows,
            datasetId: synced.data.connection.target_dataset_id,
            sync_run: synced.data.sync_run,
            job_id: synced.data.job.id,
          },
          rowCount: rows,
        };
      }

      case "runs": {
        const id = String(body.id || "");
        if (!id) return { success: false, error: "id is required" };
        const runs = await djangoApi.listSyncRuns(id);
        if (runs.error) return { success: false, error: runs.error.message };
        const mapped = (runs.data || []).map((r) => ({
          id: r.id,
          status: r.status === "succeeded" ? "success" : r.status,
          row_count: r.rows_loaded,
          duration_ms:
            r.started_at && r.finished_at
              ? Math.max(
                  0,
                  new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
                )
              : 0,
          error: r.error || null,
          created_at: r.created_at,
          triggered_by: r.mode,
        }));
        return { success: true, data: mapped };
      }

      case "load_dataset": {
        const id = String(body.id || "");
        if (!id) return { success: false, error: "id is required" };
        const listed = await djangoApi.listConnections();
        if (listed.error) return { success: false, error: listed.error.message };
        const conn = (listed.data || []).find((c) => c.id === id);
        if (!conn?.target_dataset_id) {
          return { success: false, error: "Run Sync first to fetch data" };
        }
        const dataset = await djangoApi.getDataset(conn.target_dataset_id);
        if (dataset.error || !dataset.data) {
          return { success: false, error: dataset.error?.message || "Dataset not found" };
        }
        return {
          success: true,
          data: {
            id: dataset.data.id,
            name: dataset.data.name,
            raw_data: [],
            columns: Object.keys(dataset.data.schema || {}),
            note: "Dataset metadata loaded from registry; open Dataset Explorer for full rows.",
          },
        };
      }

      case "discover": {
        const id = String(body.id || "");
        if (!id) return { success: false, error: "id is required" };
        const discovered = await djangoApi.discoverConnection(id);
        if (discovered.error || !discovered.data) {
          return { success: false, error: discovered.error?.message || "Discover failed" };
        }
        return {
          success: true,
          data: {
            schema_version: discovered.data.connection.schema_version,
            schema: discovered.data.schema,
            job_id: discovered.data.job.id,
            changed: discovered.data.job.result?.changed ?? null,
          },
        };
      }

      case "schema": {
        const id = String(body.id || "");
        if (!id) return { success: false, error: "id is required" };
        const version =
          body.version != null && body.version !== ""
            ? Number(body.version)
            : undefined;
        const schema = await djangoApi.getConnectionSchema(
          id,
          Number.isFinite(version) ? version : undefined
        );
        if (schema.error || !schema.data) {
          return { success: false, error: schema.error?.message || "Schema not found" };
        }
        return { success: true, data: schema.data };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Connector request failed",
    };
  }
}
