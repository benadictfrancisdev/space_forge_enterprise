/**
 * Sprint 3 — Wire legacy fetch-connector-data to Django + client fetch for URL APIs.
 */
import { djangoApi } from "./djangoAdapter";

const TYPE_MAP: Record<string, string> = {
  json_api: "rest_api",
  csv_url: "csv",
  airtable: "airtable",
  s3: "s3",
};

function mapConnectorConfig(
  type: string,
  config: Record<string, unknown>
): { config: Record<string, unknown>; credentials: Record<string, unknown> } {
  switch (type) {
    case "json_api":
      return {
        config: {
          url: config.url,
          method: config.method || "GET",
          json_path: config.jsonPath,
        },
        credentials: config.apiKey ? { api_key: config.apiKey } : {},
      };
    case "csv_url":
      return {
        config: { url: config.url, has_headers: config.hasHeaders !== "false" },
        credentials: {},
      };
    case "airtable":
      return {
        config: {
          base_id: config.baseId,
          table_name: config.tableId || config.tableName,
        },
        credentials: config.apiKey ? { api_key: config.apiKey } : {},
      };
    case "s3":
      return {
        config: {
          bucket: config.bucket,
          region: config.region,
          prefix: config.prefix,
        },
        credentials: {
          access_key: config.accessKey,
          secret_key: config.secretKey,
        },
      };
    default:
      return { config, credentials: {} };
  }
}

function navigateJsonPath(data: unknown, path?: string): unknown[] {
  if (!path) {
    if (Array.isArray(data)) return data as unknown[];
    return [];
  }
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = data;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return [];
    }
  }
  return Array.isArray(cur) ? cur : [];
}

async function fetchCsvRows(url: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      row[h] = cells[i]?.trim() ?? "";
    });
    return row;
  });
}

async function fetchJsonRows(
  url: string,
  method: string,
  apiKey?: string,
  jsonPath?: string
): Promise<Record<string, unknown>[]> {
  const headers: Record<string, string> = {};
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(url, { method: method || "GET", headers });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const rows = navigateJsonPath(json, jsonPath);
  return rows.filter((r) => r && typeof r === "object") as Record<string, unknown>[];
}

export async function handleDjangoFetchConnectorDataInvoke(
  body: Record<string, unknown>
): Promise<{
  success: boolean;
  error?: string;
  data?: Record<string, unknown>[];
  columns?: string[];
}> {
  const type = String(body.type || "");
  const config = (body.config as Record<string, unknown>) || {};
  const testOnly = Boolean(body.testOnly);

  try {
    if (testOnly) {
      const connectorType = TYPE_MAP[type];
      if (!connectorType) {
        return { success: false, error: `Connector type not wired to platform: ${type}` };
      }
      const mapped = mapConnectorConfig(type, config);
      const draft = await djangoApi.testConnectorDraft({
        connectorType,
        config: mapped.config,
        credentials: mapped.credentials,
      });
      if (draft.error || !draft.data) {
        return { success: false, error: draft.error?.message || "Test failed" };
      }
      return { success: draft.data.ok, error: draft.data.ok ? undefined : draft.data.message };
    }

    if (type === "csv_url" && config.url) {
      const rows = await fetchCsvRows(String(config.url));
      return {
        success: rows.length > 0,
        data: rows,
        columns: rows.length ? Object.keys(rows[0]) : [],
        error: rows.length ? undefined : "No rows returned",
      };
    }

    if (type === "json_api" && config.url) {
      const rows = await fetchJsonRows(
        String(config.url),
        String(config.method || "GET"),
        config.apiKey ? String(config.apiKey) : undefined,
        config.jsonPath ? String(config.jsonPath) : undefined
      );
      return {
        success: rows.length > 0,
        data: rows,
        columns: rows.length ? Object.keys(rows[0]) : [],
        error: rows.length ? undefined : "No rows at json path",
      };
    }

    const connectorType = TYPE_MAP[type];
    if (!connectorType) {
      return { success: false, error: `Connector type not wired to platform: ${type}` };
    }
    const mapped = mapConnectorConfig(type, config);
    const tenant = await djangoApi.ensureTenant();
    if (tenant.error || !tenant.data) {
      return { success: false, error: tenant.error?.message || "tenant required" };
    }
    const created = await djangoApi.createConnection({
      name: `Workflow ${type} ${Date.now()}`,
      connectorType,
      config: mapped.config,
      secrets: mapped.credentials,
    });
    if (created.error || !created.data) {
      return { success: false, error: created.error?.message || "Connection create failed" };
    }
    const synced = await djangoApi.syncConnection(created.data.id, { mode: "full" });
    if (synced.error || !synced.data) {
      return { success: false, error: synced.error?.message || "Sync failed" };
    }
    const datasetId = synced.data.connection.target_dataset_id;
    return {
      success: true,
      data: [],
      error: datasetId
        ? `Synced ${synced.data.sync_run.rows_loaded ?? 0} rows to platform dataset ${datasetId}. Open Executive Suite with ?dataset=${datasetId}`
        : "Sync completed but no dataset id returned",
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
