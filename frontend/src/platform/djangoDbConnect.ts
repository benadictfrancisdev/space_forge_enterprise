/**
 * Sprint 3 — Wire legacy db-connect edge function to Django integrations API.
 */
import { djangoApi, type ConnectionRecord } from "./djangoAdapter";
import { httpRequest } from "./httpClient";

const DB_CONNECTOR_TYPES = new Set(["postgresql", "mysql", "mongodb", "sqlserver"]);

function mapFormToConfig(connection: Record<string, unknown>) {
  return {
    host: connection.host,
    port: connection.port,
    database: connection.database_name ?? connection.database,
    database_name: connection.database_name,
    ssl: connection.ssl_enabled,
  };
}

function mapFormToCredentials(connection: Record<string, unknown>) {
  const creds: Record<string, unknown> = {};
  if (connection.username) creds.username = connection.username;
  if (connection.password) creds.password = connection.password;
  return creds;
}

function connectionToUi(conn: ConnectionRecord) {
  const config = (conn.config || {}) as Record<string, unknown>;
  return {
    id: conn.id,
    name: conn.name,
    db_type: conn.connector_type,
    host: String(config.host || ""),
    port: Number(config.port || 0),
    database_name: String(config.database || config.database_name || ""),
    username: "",
    ssl_enabled: Boolean(config.ssl),
    is_active: conn.is_active,
    connection_status: conn.health_status || "unknown",
    last_connected_at: conn.last_sync_at,
    created_at: conn.created_at,
  };
}

function tablesFromSchema(schema: Record<string, unknown> | null | undefined): string[] {
  if (!schema) return [];
  const tables = schema.tables as Array<{ name?: string }> | undefined;
  if (tables?.length) return tables.map((t) => String(t.name || "")).filter(Boolean);
  const entities = schema.entities as Array<{ name?: string }> | undefined;
  if (entities?.length) return entities.map((e) => String(e.name || "")).filter(Boolean);
  return [];
}

export async function handleDjangoDbConnectInvoke(
  body: Record<string, unknown>
): Promise<{ success: boolean; message?: string; error?: string; tables?: string[]; data?: unknown }> {
  const action = String(body.action || "");
  const connection = (body.connection as Record<string, unknown>) || {};
  const connectionId = String(body.connectionId || "");

  try {
    const tenant = await djangoApi.ensureTenant();
    if (tenant.error || !tenant.data) {
      return { success: false, error: tenant.error?.message || "tenant required" };
    }

    if (action === "test") {
      const dbType = String(connection.db_type || "postgresql");
      if (!DB_CONNECTOR_TYPES.has(dbType)) {
        return { success: false, message: `Unsupported database type: ${dbType}` };
      }
      const envelope = await httpRequest<{
        ok: boolean;
        message?: string;
        details?: Record<string, unknown>;
      }>({
        method: "POST",
        path: "/api/v1/connectors/test/",
        body: {
          organization_id: tenant.data.organizationId,
          connector_type: dbType,
          config: mapFormToConfig(connection),
          credentials: mapFormToCredentials(connection),
        },
      });
      const result = envelope.data;
      const tables = tablesFromSchema(
        (result?.details?.schema as Record<string, unknown>) || (result?.details as Record<string, unknown>)
      );
      return {
        success: Boolean(result?.ok),
        message: result?.message || (result?.ok ? "Connection successful" : "Connection failed"),
        tables,
      };
    }

    if (action === "save") {
      const dbType = String(connection.db_type || "postgresql");
      const created = await djangoApi.createConnection({
        name: String(connection.name || "Database connection"),
        connectorType: dbType,
        config: mapFormToConfig(connection),
        secrets: mapFormToCredentials(connection),
        authMethod: "password",
      });
      if (created.error || !created.data) {
        return { success: false, error: created.error?.message || "Save failed" };
      }
      return { success: true, message: "Connection saved", data: connectionToUi(created.data) };
    }

    if (action === "delete") {
      if (!connectionId) return { success: false, error: "connectionId required" };
      const deleted = await djangoApi.deleteConnection(connectionId);
      if (deleted.error) return { success: false, error: deleted.error.message };
      return { success: true, message: "Connection deleted" };
    }

    if (action === "list") {
      const listed = await djangoApi.listConnections();
      if (listed.error) return { success: false, error: listed.error.message };
      return {
        success: true,
        data: (listed.data || [])
          .filter((c) => DB_CONNECTOR_TYPES.has(c.connector_type))
          .map(connectionToUi),
      };
    }

    if (action === "list-tables") {
      if (!connectionId) return { success: false, error: "connectionId required" };
      const discovered = await djangoApi.discoverConnection(connectionId);
      if (discovered.error || !discovered.data) {
        return { success: false, error: discovered.error?.message || "Discover failed" };
      }
      const tables = tablesFromSchema(discovered.data.schema as Record<string, unknown>);
      return { success: true, tables };
    }

    return { success: false, error: `Unknown action: ${action}` };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
