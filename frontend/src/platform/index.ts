/**
 * Enterprise backend client façade.
 * Track 2–5: REST adapters for auth/storage/datasets/AI when VITE_API_BASE_URL is set.
 */

import type { RealtimeChannel, ServiceResult } from "./contracts";
import { DjangoAuthService, forceRefreshAccessToken } from "./djangoAuth";
import { DjangoStorageService, djangoApi } from "./djangoAdapter";
import { DjangoAIService, invokeLegacyAIFunction } from "./djangoAI";
import { configureHttpClient, configureTokenRefresher, isApiConfigured } from "./httpClient";
import { getOrganizationId, getWorkspaceId } from "./tenant";
import {
  StubAIService,
  StubAuthService,
  StubBackendFunctionService,
  StubDatabaseService,
  StubNotificationService,
  StubRealtimeService,
  StubStorageService,
} from "./stubs";

const useDjango = isApiConfigured();

const authService = useDjango ? new DjangoAuthService() : new StubAuthService();
const databaseService = new StubDatabaseService();
const aiService = useDjango ? new DjangoAIService() : new StubAIService();
const functionService = new StubBackendFunctionService();
const storageService = useDjango ? new DjangoStorageService() : new StubStorageService();
const notificationService = new StubNotificationService();
const realtimeService = new StubRealtimeService();

const AI_FUNCTION_NAMES = new Set([
  "data-agent",
  "predictive-forecast",
  "indian-business-intel",
  "spacebot",
]);

/** Track 8.1 — local-first handlers until Sprint 2 Django endpoints */
const LOCAL_FUNCTION_NAMES = new Set(["feature-history"]);

if (useDjango && authService instanceof DjangoAuthService) {
  configureHttpClient({
    getAccessToken: () => authService.getAccessToken(),
    getTenant: () => ({
      organizationId: getOrganizationId(),
      workspaceId: getWorkspaceId(),
    }),
    ensureTenant: async () => {
      const result = await djangoApi.ensureTenant();
      return !result.error && !!result.data;
    },
  });
  configureTokenRefresher(() => forceRefreshAccessToken());
}

async function enrichBody(body: unknown): Promise<Record<string, unknown> | unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const next = { ...(body as Record<string, unknown>) };
  const uid = authService.getUserId();
  const email = authService.getEmail();
  if (uid && !next.userId) next.userId = uid;
  if (email && !next.userEmail) next.userEmail = email;
  return next;
}

export const backend = {
  from: (table: string) => databaseService.from(table),

  functions: {
    async invoke(
      name: string,
      options?: { body?: Record<string, unknown>; headers?: Record<string, string> }
    ): Promise<ServiceResult<unknown>> {
      const body = (await enrichBody(options?.body ?? {})) as Record<string, unknown>;

      if (useDjango && name === "save-dataset") {
        const fileName = String(body.original_filename || body.name || "dataset.csv");
        const created = await djangoApi.createDataset({
          name: String(body.name || fileName),
          description: `rows=${body.row_count ?? "?"} cols=${body.column_count ?? "?"}`,
        });
        if (created.error || !created.data) {
          return { data: null, error: created.error ?? new Error("dataset create failed") };
        }
        return {
          data: {
            success: true,
            data: {
              id: created.data.id,
              name: created.data.name,
              status: created.data.status,
            },
          },
          error: null,
        };
      }

      if (useDjango && AI_FUNCTION_NAMES.has(name)) {
        return invokeLegacyAIFunction(name, body);
      }

      if (useDjango && name === "db-connect") {
        const { handleDjangoDbConnectInvoke } = await import("./djangoDbConnect");
        const result = await handleDjangoDbConnectInvoke(body);
        if (!result.success) {
          return {
            data: { success: false, error: result.error, message: result.error },
            error: result.error ? new Error(result.error) : null,
          };
        }
        return {
          data: {
            success: true,
            message: result.message,
            tables: result.tables,
            data: result.data,
          },
          error: null,
        };
      }

      if (useDjango && name === "fetch-connector-data") {
        const { handleDjangoFetchConnectorDataInvoke } = await import("./djangoFetchConnector");
        const result = await handleDjangoFetchConnectorDataInvoke(body);
        if (!result.success) {
          return {
            data: { success: false, error: result.error },
            error: result.error ? new Error(result.error) : null,
          };
        }
        return {
          data: {
            success: true,
            data: result.data,
            columns: result.columns,
            error: result.error,
          },
          error: null,
        };
      }

      if (useDjango && name === "live-connectors") {
        const { handleDjangoLiveConnectorsInvoke } = await import("./djangoConnectors");
        const result = await handleDjangoLiveConnectorsInvoke(body);
        if (!result.success) {
          return { data: null, error: new Error(result.error || "Request failed") };
        }
        return {
          data: {
            success: true,
            data: result.data,
            rowCount: result.rowCount,
          },
          error: null,
        };
      }

      if (name === "live-connectors") {
        const { handleLiveConnectorsInvoke } = await import("@/lib/liveConnectorsStore");
        const result = handleLiveConnectorsInvoke(body);
        if (!result.success) {
          return { data: null, error: new Error(result.error || "Request failed") };
        }
        return { data: { success: true, data: result.data, rowCount: result.rowCount }, error: null };
      }

      if (LOCAL_FUNCTION_NAMES.has(name)) {
        const { handleFeatureHistoryInvoke } = await import("@/lib/featureHistoryStore");
        const result = handleFeatureHistoryInvoke(body);
        if (!result.success) {
          return { data: null, error: new Error(result.error || "Request failed") };
        }
        return { data: { success: true, data: result.data }, error: null };
      }

      const headers: Record<string, string> = { ...(options?.headers ?? {}) };
      if (useDjango && authService instanceof DjangoAuthService) {
        const access = await authService.getAccessToken();
        if (access && !headers.Authorization && !headers.authorization) {
          headers.Authorization = `Bearer ${access}`;
        }
      } else {
        const token = await authService.getIdToken();
        if (token && !headers.Authorization && !headers.authorization) {
          headers.Authorization = `Bearer ${token}`;
        }
      }
      return functionService.invoke(name, body, headers);
    },
  },

  channel: (name: string): RealtimeChannel => realtimeService.channel(name),
  removeChannel: (channel: RealtimeChannel) => realtimeService.removeChannel(channel),
};

/** Domain services for new code — prefer these over `backend.*`. */
export const platform = {
  auth: authService,
  db: databaseService,
  ai: aiService,
  functions: functionService,
  storage: storageService,
  notifications: notificationService,
  realtime: realtimeService,
  api: djangoApi,
};

export type { Json, RealtimeChannel, ServiceResult } from "./contracts";
export type {
  AuthService,
  AIService,
  BackendFunctionService,
  DatabaseService,
  StorageService,
  NotificationService,
  RealtimeService,
} from "./contracts";
export { PlatformError } from "./errors";
export type { ApiEnvelope } from "./envelope";
export { isApiConfigured } from "./httpClient";
export { platformClient } from "./track13/platformClient";
export type { PlatformInsightBundle } from "./track13/contracts";
