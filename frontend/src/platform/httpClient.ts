/**
 * Low-level HTTP client for Django REST — Track 2.1 / 2.4.
 * Retry on network / 502–504. No Axios.
 */

import { normalizeResponse, type ApiEnvelope } from "./envelope";
import { PlatformError, toPlatformError } from "./errors";

export type TokenRefresher = () => Promise<string | null>;

let tokenRefresher: TokenRefresher | null = null;

/** Register a handler that refreshes access tokens (Track 8.7). */
export function configureTokenRefresher(refresher: TokenRefresher): void {
  tokenRefresher = refresher;
}

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface HttpRequestOptions {
  method?: HttpMethod;
  path: string;
  query?: Record<string, string | undefined | null>;
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  /** Skip Authorization header (e.g. token exchange). */
  public?: boolean;
  timeoutMs?: number;
  retries?: number;
}

function apiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return (raw ?? "").replace(/\/$/, "");
}

export function isApiConfigured(): boolean {
  return apiBaseUrl().length > 0;
}

function buildUrl(path: string, query?: HttpRequestOptions["query"]): string {
  const base = apiBaseUrl();
  if (!base) {
    throw new PlatformError("VITE_API_BASE_URL is not configured", {
      code: "network",
      status: 0,
    });
  }
  const url = new URL(path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export type TokenProvider = () => Promise<string | null>;
export type TenantProvider = () => { organizationId: string | null; workspaceId: string | null };
export type TenantBootstrap = () => Promise<boolean>;

let tokenProvider: TokenProvider = async () => null;
let tenantProvider: TenantProvider = () => ({
  organizationId: null,
  workspaceId: null,
});
let tenantBootstrap: TenantBootstrap | null = null;

export function configureHttpClient(opts: {
  getAccessToken: TokenProvider;
  getTenant: TenantProvider;
  /** Persist org/workspace ids before tenant-scoped API calls when headers are missing. */
  ensureTenant?: TenantBootstrap;
}): void {
  tokenProvider = opts.getAccessToken;
  tenantProvider = opts.getTenant;
  tenantBootstrap = opts.ensureTenant ?? null;
}

async function resolveTenantHeaders(): Promise<{ organizationId: string | null; workspaceId: string | null }> {
  let tenant = tenantProvider();
  if (!tenant.organizationId && tenantBootstrap) {
    await tenantBootstrap();
    tenant = tenantProvider();
  }
  return tenant;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

export async function httpRequest<T = unknown>(
  options: HttpRequestOptions
): Promise<ApiEnvelope<T>> {
  const retries = options.retries ?? 2;
  const timeoutMs = options.timeoutMs ?? 30_000;
  let lastError: PlatformError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = { ...(options.headers ?? {}) };

      if (!options.public) {
        const token = await tokenProvider();
        if (token) headers.Authorization = `Bearer ${token}`;
        const tenant = await resolveTenantHeaders();
        if (tenant.organizationId) headers["X-Organization-ID"] = tenant.organizationId;
        if (tenant.workspaceId) headers["X-Workspace-ID"] = tenant.workspaceId;
        headers["X-Platform-Retry-401"] = "1";
      }

      let body: BodyInit | undefined;
      if (options.formData) {
        body = options.formData;
      } else if (options.body !== undefined) {
        headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
        body = JSON.stringify(options.body);
      }

      const res = await fetch(buildUrl(options.path, options.query), {
        method: options.method ?? (options.body || options.formData ? "POST" : "GET"),
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      const text = await res.text();
      let parsed: unknown = null;
      if (text) {
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }
      }

      const envelope = normalizeResponse<T>(parsed, res.ok, res.status);

      if (!envelope.success) {
        const retryable = res.status === 502 || res.status === 503 || res.status === 504;
        const authRetry =
          res.status === 401 &&
          !options.public &&
          !!tokenRefresher &&
          attempt < retries;
        if (authRetry) {
          const fresh = await tokenRefresher();
          if (fresh) {
            await sleep(100);
            continue;
          }
        }
        if (retryable && attempt < retries) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw toPlatformError(
          envelope.message || `HTTP ${res.status}`,
          res.status,
          envelope.errors,
          typeof envelope.meta.trace_id === "string" ? envelope.meta.trace_id : undefined
        );
      }

      return envelope;
    } catch (err) {
      clearTimeout(timer);

      if (err instanceof PlatformError) {
        lastError = err;
        const retryable =
          err.code === "server" && (err.status === 502 || err.status === 503 || err.status === 504);
        if (retryable && attempt < retries) {
          await sleep(300 * (attempt + 1));
          continue;
        }
        throw err;
      }

      if (err instanceof DOMException && err.name === "AbortError") {
        lastError = new PlatformError("Request timed out", { code: "timeout", status: 0 });
        throw lastError;
      }

      lastError = new PlatformError(
        err instanceof Error ? err.message : "Network error",
        { code: "network", status: 0 }
      );
      if (attempt < retries) {
        await sleep(300 * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError ?? new PlatformError("Request failed", { code: "unknown", status: 0 });
}
