/**
 * Track 8.7 — Centralized resilience policies for platform HTTP.
 */
import type { HttpRequestOptions } from "./httpClient";

export type ResiliencePolicy = {
  timeoutMs: number;
  retries: number;
  retryOn401: boolean;
};

export const DEFAULT_RESILIENCE: ResiliencePolicy = {
  timeoutMs: 30_000,
  retries: 2,
  retryOn401: true,
};

export const AI_RESILIENCE: ResiliencePolicy = {
  timeoutMs: 90_000,
  retries: 1,
  retryOn401: true,
};

export const UPLOAD_RESILIENCE: ResiliencePolicy = {
  timeoutMs: 120_000,
  retries: 1,
  retryOn401: true,
};

export function withResilience(
  options: HttpRequestOptions,
  policy: ResiliencePolicy = DEFAULT_RESILIENCE
): HttpRequestOptions {
  return {
    ...options,
    timeoutMs: options.timeoutMs ?? policy.timeoutMs,
    retries: options.retries ?? policy.retries,
    headers: {
      ...options.headers,
      ...(policy.retryOn401 ? { "X-Platform-Retry-401": "1" } : {}),
    },
  };
}
