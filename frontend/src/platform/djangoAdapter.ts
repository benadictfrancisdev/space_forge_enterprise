/**
 * Django REST adapters — Track 2.1 / 2.5.
 * Storage + Datasets + Orgs/Workspaces. AI/functions remain stubbed.
 */

import type {
  ServiceResult,
  StorageService,
} from "./contracts";
import { PlatformError } from "./errors";
import { httpRequest, isApiConfigured } from "./httpClient";
import {
  getOrganizationId,
  getWorkspaceId,
  setTenant,
} from "./tenant";

function ok<T>(data: T): ServiceResult<T> {
  return { data, error: null };
}

function fail<T = never>(error: unknown): ServiceResult<T> {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Request failed");
  return { data: null, error: err };
}

export type Organization = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type Workspace = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  status: string;
};

export type StorageObject = {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  bucket: string;
  key: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

export type Dataset = {
  id: string;
  organization_id: string;
  workspace_id: string;
  name: string;
  description: string;
  status: string;
  profile_status?: string;
  schema: Record<string, unknown>;
  statistics?: Record<string, unknown>;
  row_count: number | null;
  version: number;
  storage_object_id?: string | null;
  created_at: string;
  updated_at: string;
};

/** Track 6 — Enterprise Execution Engine job record */
export type PlatformJob = {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  job_type: string;
  status: string;
  status_message: string;
  progress_pct: number;
  priority: number;
  attempt_count: number;
  max_retries: number;
  timeout_seconds: number;
  cancel_requested: boolean;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string;
  celery_task_id: string;
  started_at: string | null;
  finished_at: string | null;
  execution_ms: number | null;
  created_at: string;
  updated_at: string;
};

/** Track 11.3 — Integration connection registry */
export type ConnectionRecord = {
  id: string;
  organization_id: string;
  workspace_id: string;
  name: string;
  connector_type: string;
  connector_version: string;
  credential_id: string | null;
  config: Record<string, unknown>;
  health_status: string;
  last_health_message: string;
  last_tested_at: string | null;
  last_sync_at: string | null;
  next_sync_at: string | null;
  schema_version: number;
  is_active: boolean;
  sync_schedule: string;
  target_dataset_id: string | null;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Track 11.4 — Versioned schema discovery snapshot */
export type SchemaSnapshotRecord = {
  id: string;
  organization_id: string;
  workspace_id: string;
  connection_id: string;
  version: number;
  discovered_at: string;
  tables: Array<Record<string, unknown>>;
  fingerprint: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/** Track 11.5 — Sync run history */
export type SyncRunRecord = {
  id: string;
  organization_id: string;
  workspace_id: string;
  connection_id: string;
  job_id: string | null;
  mode: string;
  status: string;
  rows_extracted: number;
  rows_loaded: number;
  cursor_state: Record<string, unknown>;
  error: string;
  started_at: string | null;
  finished_at: string | null;
  storage_object_id: string | null;
  dataset_id: string | null;
  created_at: string;
  updated_at: string;
};

export class DjangoStorageService implements StorageService {
  async upload(
    _bucket: string,
    _path: string,
    file: Blob | File
  ): Promise<ServiceResult<{ path: string }>> {
    try {
      const orgId = getOrganizationId();
      if (!orgId) throw new PlatformError("No organization selected", { code: "validation" });

      const form = new FormData();
      form.append("organization_id", orgId);
      const ws = getWorkspaceId();
      if (ws) form.append("workspace_id", ws);
      const filename = file instanceof File ? file.name : "upload.bin";
      form.append("file", file, filename);

      const envelope = await httpRequest<StorageObject>({
        method: "POST",
        path: "/api/v1/storage/objects/",
        formData: form,
      });

      const obj = envelope.data;
      if (!obj) throw new PlatformError("Empty storage response", { code: "server", status: 500 });
      return ok({ path: obj.key || obj.id });
    } catch (e) {
      return fail(e);
    }
  }

  getPublicUrl(_bucket: string, path: string): string {
    return path;
  }

  async download(_bucket: string, _path: string): Promise<ServiceResult<Blob>> {
    return fail(new PlatformError("Storage download API planned for Track 4", { code: "not_found", status: 404 }));
  }
}

/** Domain helpers used by Track 2.5 production flow (not legacy StorageService shape). */
export const djangoApi = {
  async health(): Promise<ServiceResult<{ status: string; service?: string }>> {
    try {
      const envelope = await httpRequest<{ status: string; service?: string }>({
        method: "GET",
        path: "/health/",
        public: true,
        retries: 1,
      });
      return ok(envelope.data ?? { status: "unknown" });
    } catch (e) {
      return fail(e);
    }
  },

  async ready(): Promise<ServiceResult<unknown>> {
    try {
      const envelope = await httpRequest({
        method: "GET",
        path: "/health/ready/",
        public: true,
        retries: 0,
      });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async me(): Promise<ServiceResult<{ id: string; email: string }>> {
    try {
      const envelope = await httpRequest<{ id: string; email: string }>({
        method: "GET",
        path: "/api/v1/auth/me/",
      });
      return ok(envelope.data as { id: string; email: string });
    } catch (e) {
      return fail(e);
    }
  },

  async listOrganizations(): Promise<ServiceResult<Organization[]>> {
    try {
      const envelope = await httpRequest<Organization[]>({
        method: "GET",
        path: "/api/v1/organizations/",
      });
      return ok(envelope.data ?? []);
    } catch (e) {
      return fail(e);
    }
  },

  async createOrganization(name: string): Promise<ServiceResult<Organization>> {
    try {
      const envelope = await httpRequest<Organization>({
        method: "POST",
        path: "/api/v1/organizations/",
        body: { name },
      });
      if (!envelope.data) throw new PlatformError("Empty org response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async listWorkspaces(organizationId: string): Promise<ServiceResult<Workspace[]>> {
    try {
      const envelope = await httpRequest<Workspace[]>({
        method: "GET",
        path: "/api/v1/workspaces/",
        query: { organization_id: organizationId },
      });
      return ok(envelope.data ?? []);
    } catch (e) {
      return fail(e);
    }
  },

  async createWorkspace(
    organizationId: string,
    name: string
  ): Promise<ServiceResult<Workspace>> {
    try {
      const envelope = await httpRequest<Workspace>({
        method: "POST",
        path: "/api/v1/workspaces/",
        body: { organization_id: organizationId, name },
      });
      if (!envelope.data) throw new PlatformError("Empty workspace response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  /**
   * Ensure org + workspace exist and are stored for X-Organization-ID / X-Workspace-ID.
   */
  async ensureTenant(): Promise<ServiceResult<{ organizationId: string; workspaceId: string }>> {
    try {
      let orgId = getOrganizationId();
      let wsId = getWorkspaceId();

      const orgsResult = await djangoApi.listOrganizations();
      if (orgsResult.error) return fail(orgsResult.error);
      let orgs = orgsResult.data ?? [];

      if (!orgId || !orgs.some((o) => o.id === orgId)) {
        if (orgs.length === 0) {
          const created = await djangoApi.createOrganization("Personal Workspace");
          if (created.error || !created.data) return fail(created.error ?? new Error("org create failed"));
          orgs = [created.data];
        }
        orgId = orgs[0].id;
      }

      const wsResult = await djangoApi.listWorkspaces(orgId);
      if (wsResult.error) return fail(wsResult.error);
      let workspaces = wsResult.data ?? [];

      if (!wsId || !workspaces.some((w) => w.id === wsId)) {
        if (workspaces.length === 0) {
          const created = await djangoApi.createWorkspace(orgId, "Default");
          if (created.error || !created.data) return fail(created.error ?? new Error("workspace create failed"));
          workspaces = [created.data];
        }
        wsId = workspaces[0].id;
      }

      setTenant(orgId, wsId);
      return ok({ organizationId: orgId, workspaceId: wsId });
    } catch (e) {
      return fail(e);
    }
  },

  async uploadFile(file: Blob | File): Promise<ServiceResult<StorageObject>> {
    try {
      const tenant = await djangoApi.ensureTenant();
      if (tenant.error || !tenant.data) return fail(tenant.error ?? new Error("tenant required"));

      const form = new FormData();
      form.append("organization_id", tenant.data.organizationId);
      form.append("workspace_id", tenant.data.workspaceId);
      const filename = file instanceof File ? file.name : "upload.bin";
      form.append("file", file, filename);

      const envelope = await httpRequest<StorageObject>({
        method: "POST",
        path: "/api/v1/storage/objects/",
        formData: form,
      });
      if (!envelope.data) throw new PlatformError("Empty upload response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async createDataset(input: {
    name: string;
    description?: string;
    storageObjectId?: string;
    rowCount?: number;
    schema?: Record<string, unknown>;
  }): Promise<ServiceResult<Dataset>> {
    try {
      const tenant = await djangoApi.ensureTenant();
      if (tenant.error || !tenant.data) return fail(tenant.error ?? new Error("tenant required"));

      const envelope = await httpRequest<Dataset>({
        method: "POST",
        path: "/api/v1/datasets/",
        body: {
          organization_id: tenant.data.organizationId,
          workspace_id: tenant.data.workspaceId,
          name: input.name,
          description: input.description ?? "",
          ...(input.storageObjectId ? { storage_object_id: input.storageObjectId } : {}),
          ...(input.rowCount != null ? { row_count: input.rowCount } : {}),
          ...(input.schema ? { schema: input.schema } : {}),
        },
      });
      if (!envelope.data) throw new PlatformError("Empty dataset response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async getDataset(datasetId: string): Promise<ServiceResult<Dataset>> {
    try {
      const envelope = await httpRequest<Dataset>({
        method: "GET",
        path: `/api/v1/datasets/${datasetId}/`,
      });
      if (!envelope.data) throw new PlatformError("Empty dataset response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async profileDataset(datasetId: string): Promise<ServiceResult<Dataset>> {
    try {
      const envelope = await httpRequest<Dataset>({
        method: "POST",
        path: `/api/v1/datasets/${datasetId}/profile/`,
      });
      if (!envelope.data) throw new PlatformError("Empty profile response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async getDatasetStatistics(datasetId: string): Promise<
    ServiceResult<{
      dataset_id: string;
      profile_status: string;
      row_count: number | null;
      schema: Record<string, unknown>;
      statistics: Record<string, unknown>;
    }>
  > {
    try {
      const envelope = await httpRequest<{
        dataset_id: string;
        profile_status: string;
        row_count: number | null;
        schema: Record<string, unknown>;
        statistics: Record<string, unknown>;
      }>({
        method: "GET",
        path: `/api/v1/datasets/${datasetId}/statistics/`,
      });
      if (!envelope.data) throw new PlatformError("Empty statistics response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async listDatasets(): Promise<ServiceResult<Dataset[]>> {
    try {
      const tenant = await djangoApi.ensureTenant();
      if (tenant.error || !tenant.data) return fail(tenant.error ?? new Error("tenant required"));

      const envelope = await httpRequest<Dataset[]>({
        method: "GET",
        path: "/api/v1/datasets/",
        query: { organization_id: tenant.data.organizationId },
      });
      return ok(envelope.data ?? []);
    } catch (e) {
      return fail(e);
    }
  },

  /**
   * Track 4 production pipeline: Upload → Storage → Dataset (+ bind) → Profile.
   */
  async uploadAndRegisterDataset(file: File, name?: string): Promise<
    ServiceResult<{ storage: StorageObject; dataset: Dataset }>
  > {
    const uploaded = await djangoApi.uploadFile(file);
    if (uploaded.error || !uploaded.data) return fail(uploaded.error ?? new Error("upload failed"));

    const dataset = await djangoApi.createDataset({
      name: name || file.name,
      description: `Uploaded via platform adapter (${uploaded.data.id})`,
      storageObjectId: uploaded.data.id,
    });
    if (dataset.error || !dataset.data) return fail(dataset.error ?? new Error("dataset create failed"));

    const profiled = await djangoApi.profileDataset(dataset.data.id);
    if (profiled.error || !profiled.data) {
      // Registration succeeded even if profile fails — return dataset as-is
      return ok({ storage: uploaded.data, dataset: dataset.data });
    }

    return ok({ storage: uploaded.data, dataset: profiled.data });
  },

  /** Track 6 — Enterprise Execution Engine */
  async enqueueJob(input: {
    jobType: string;
    payload?: Record<string, unknown>;
    priority?: number;
    timeoutSeconds?: number;
    maxRetries?: number;
    workspaceId?: string;
  }): Promise<ServiceResult<PlatformJob>> {
    try {
      const tenant = await djangoApi.ensureTenant();
      if (tenant.error || !tenant.data) return fail(tenant.error ?? new Error("tenant required"));

      const envelope = await httpRequest<PlatformJob>({
        method: "POST",
        path: "/api/v1/jobs/",
        body: {
          organization_id: tenant.data.organizationId,
          workspace_id: input.workspaceId ?? tenant.data.workspaceId,
          job_type: input.jobType,
          payload: input.payload ?? {},
          ...(input.priority != null ? { priority: input.priority } : {}),
          ...(input.timeoutSeconds != null ? { timeout_seconds: input.timeoutSeconds } : {}),
          ...(input.maxRetries != null ? { max_retries: input.maxRetries } : {}),
        },
      });
      if (!envelope.data) throw new PlatformError("Empty job response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async getJob(jobId: string): Promise<ServiceResult<PlatformJob>> {
    try {
      const envelope = await httpRequest<PlatformJob>({
        method: "GET",
        path: `/api/v1/jobs/${jobId}/`,
      });
      if (!envelope.data) throw new PlatformError("Empty job response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async listJobs(): Promise<ServiceResult<PlatformJob[]>> {
    try {
      const tenant = await djangoApi.ensureTenant();
      if (tenant.error || !tenant.data) return fail(tenant.error ?? new Error("tenant required"));

      const envelope = await httpRequest<PlatformJob[]>({
        method: "GET",
        path: "/api/v1/jobs/",
        query: { organization_id: tenant.data.organizationId },
      });
      return ok(envelope.data ?? []);
    } catch (e) {
      return fail(e);
    }
  },

  async cancelJob(jobId: string): Promise<ServiceResult<PlatformJob>> {
    try {
      const envelope = await httpRequest<PlatformJob>({
        method: "POST",
        path: `/api/v1/jobs/${jobId}/cancel/`,
      });
      if (!envelope.data) throw new PlatformError("Empty job response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async retryJob(jobId: string): Promise<ServiceResult<PlatformJob>> {
    try {
      const envelope = await httpRequest<PlatformJob>({
        method: "POST",
        path: `/api/v1/jobs/${jobId}/retry/`,
      });
      if (!envelope.data) throw new PlatformError("Empty job response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  /**
   * Enqueue full intelligence pipeline: Profile → Forecast → Narrative → Decisions → Report.
   */
  async enqueueDatasetPipeline(
    datasetId: string,
    options?: { horizon?: number; priority?: number }
  ): Promise<ServiceResult<PlatformJob>> {
    return djangoApi.enqueueJob({
      jobType: "dataset.pipeline",
      payload: {
        dataset_id: datasetId,
        ...(options?.horizon != null ? { horizon: options.horizon } : {}),
      },
      priority: options?.priority ?? 5,
      timeoutSeconds: 600,
    });
  },

  async aiCompute(
    operation: string,
    input: {
      datasetId?: string;
      question?: string;
      message?: string;
      query?: string;
      hypothesis?: string;
      targetColumn?: string;
      horizon?: number;
      module?: string;
      params?: Record<string, unknown>;
    } = {}
  ): Promise<ServiceResult<Record<string, unknown>>> {
    try {
      const tenant = await djangoApi.ensureTenant();
      if (tenant.error || !tenant.data) return fail(tenant.error ?? new Error("tenant required"));

      const envelope = await httpRequest<Record<string, unknown>>({
        method: "POST",
        path: `/api/v1/ai/${operation}/`,
        body: {
          organization_id: tenant.data.organizationId,
          ...(input.datasetId ? { dataset_id: input.datasetId } : {}),
          ...(input.question ? { question: input.question } : {}),
          ...(input.message ? { message: input.message } : {}),
          ...(input.query ? { query: input.query } : {}),
          ...(input.hypothesis ? { hypothesis: input.hypothesis } : {}),
          ...(input.targetColumn ? { target_column: input.targetColumn } : {}),
          ...(input.horizon != null ? { horizon: input.horizon } : {}),
          ...(input.module ? { module: input.module } : {}),
          ...(input.params ? { params: input.params } : {}),
        },
        timeoutMs: 60_000,
      });
      if (!envelope.data) throw new PlatformError("Empty AI response", { code: "server", status: 500 });
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async listConnections(): Promise<ServiceResult<ConnectionRecord[]>> {
    try {
      const tenant = await djangoApi.ensureTenant();
      if (tenant.error || !tenant.data) return fail(tenant.error ?? new Error("tenant required"));
      const envelope = await httpRequest<ConnectionRecord[]>({
        method: "GET",
        path: "/api/v1/connections/",
        query: {
          organization_id: tenant.data.organizationId,
          workspace_id: tenant.data.workspaceId,
        },
      });
      return ok(envelope.data ?? []);
    } catch (e) {
      return fail(e);
    }
  },

  async createConnection(input: {
    name: string;
    connectorType: string;
    config?: Record<string, unknown>;
    secrets?: Record<string, unknown>;
    syncSchedule?: string;
    authMethod?: string;
  }): Promise<ServiceResult<ConnectionRecord>> {
    try {
      const tenant = await djangoApi.ensureTenant();
      if (tenant.error || !tenant.data) return fail(tenant.error ?? new Error("tenant required"));
      const envelope = await httpRequest<ConnectionRecord>({
        method: "POST",
        path: "/api/v1/connections/",
        body: {
          organization_id: tenant.data.organizationId,
          workspace_id: tenant.data.workspaceId,
          name: input.name,
          connector_type: input.connectorType,
          config: input.config || {},
          sync_schedule: input.syncSchedule || "manual",
          ...(input.secrets && Object.keys(input.secrets).length
            ? { secrets: input.secrets, auth_method: input.authMethod || "password" }
            : {}),
        },
      });
      if (!envelope.data) {
        throw new PlatformError("Empty connection response", { code: "server", status: 500 });
      }
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async updateConnection(
    connectionId: string,
    input: {
      name?: string;
      config?: Record<string, unknown>;
      syncSchedule?: string;
      isActive?: boolean;
      secrets?: Record<string, unknown>;
    }
  ): Promise<ServiceResult<ConnectionRecord>> {
    try {
      const envelope = await httpRequest<ConnectionRecord>({
        method: "PATCH",
        path: `/api/v1/connections/${connectionId}/`,
        body: {
          ...(input.name != null ? { name: input.name } : {}),
          ...(input.config ? { config: input.config } : {}),
          ...(input.syncSchedule != null ? { sync_schedule: input.syncSchedule } : {}),
          ...(input.isActive != null ? { is_active: input.isActive } : {}),
          ...(input.secrets && Object.keys(input.secrets).length
            ? { secrets: input.secrets }
            : {}),
        },
      });
      if (!envelope.data) {
        throw new PlatformError("Empty connection response", { code: "server", status: 500 });
      }
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async deleteConnection(connectionId: string): Promise<ServiceResult<{ deleted: boolean }>> {
    try {
      await httpRequest({
        method: "DELETE",
        path: `/api/v1/connections/${connectionId}/`,
      });
      return ok({ deleted: true });
    } catch (e) {
      return fail(e);
    }
  },

  async testConnection(
    connectionId: string
  ): Promise<ServiceResult<{ job: PlatformJob; connection: ConnectionRecord }>> {
    try {
      const envelope = await httpRequest<{ job: PlatformJob; connection: ConnectionRecord }>({
        method: "POST",
        path: `/api/v1/connections/${connectionId}/test/`,
        body: {},
      });
      if (!envelope.data) {
        throw new PlatformError("Empty connection test response", { code: "server", status: 500 });
      }
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async discoverConnection(
    connectionId: string
  ): Promise<
    ServiceResult<{
      job: PlatformJob;
      connection: ConnectionRecord;
      schema: SchemaSnapshotRecord | null;
    }>
  > {
    try {
      const envelope = await httpRequest<{
        job: PlatformJob;
        connection: ConnectionRecord;
        schema: SchemaSnapshotRecord | null;
      }>({
        method: "POST",
        path: `/api/v1/connections/${connectionId}/discover/`,
        body: {},
        timeoutMs: 120_000,
      });
      if (!envelope.data) {
        throw new PlatformError("Empty discover response", { code: "server", status: 500 });
      }
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async getConnectionSchema(
    connectionId: string,
    version?: number
  ): Promise<ServiceResult<SchemaSnapshotRecord>> {
    try {
      const envelope = await httpRequest<SchemaSnapshotRecord>({
        method: "GET",
        path: `/api/v1/connections/${connectionId}/schema/`,
        query: version != null ? { version: String(version) } : undefined,
      });
      if (!envelope.data) {
        throw new PlatformError("Empty schema response", { code: "server", status: 500 });
      }
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async syncConnection(
    connectionId: string,
    input: { mode?: "full" | "incremental"; batchSize?: number } = {}
  ): Promise<
    ServiceResult<{
      job: PlatformJob;
      sync_run: SyncRunRecord;
      connection: ConnectionRecord;
    }>
  > {
    try {
      const envelope = await httpRequest<{
        job: PlatformJob;
        sync_run: SyncRunRecord;
        connection: ConnectionRecord;
      }>({
        method: "POST",
        path: `/api/v1/connections/${connectionId}/sync/`,
        body: {
          mode: input.mode || "full",
          ...(input.batchSize != null ? { batch_size: input.batchSize } : {}),
        },
        timeoutMs: 120_000,
      });
      if (!envelope.data) {
        throw new PlatformError("Empty sync response", { code: "server", status: 500 });
      }
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  async listSyncRuns(connectionId: string): Promise<ServiceResult<SyncRunRecord[]>> {
    try {
      const envelope = await httpRequest<SyncRunRecord[]>({
        method: "GET",
        path: `/api/v1/connections/${connectionId}/sync-runs/`,
      });
      return ok(envelope.data ?? []);
    } catch (e) {
      return fail(e);
    }
  },

  async testConnectorDraft(input: {
    connectorType: string;
    config?: Record<string, unknown>;
    credentials?: Record<string, unknown>;
  }): Promise<ServiceResult<{ ok: boolean; message: string; rowCount?: number }>> {
    try {
      const tenant = await djangoApi.ensureTenant();
      if (tenant.error || !tenant.data) return fail(tenant.error ?? new Error("tenant required"));
      const envelope = await httpRequest<{
        ok: boolean;
        message: string;
        rowCount?: number;
      }>({
        method: "POST",
        path: "/api/v1/connectors/test/",
        body: {
          organization_id: tenant.data.organizationId,
          connector_type: input.connectorType,
          config: input.config || {},
          credentials: input.credentials || {},
        },
      });
      if (!envelope.data) {
        throw new PlatformError("Empty connector test response", { code: "server", status: 500 });
      }
      return ok(envelope.data);
    } catch (e) {
      return fail(e);
    }
  },

  isConfigured: isApiConfigured,
};
