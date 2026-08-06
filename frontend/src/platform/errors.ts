/**
 * Central platform errors — Track 2.4.
 * Feature components should not invent their own HTTP error parsing.
 */

export type PlatformErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "timeout"
  | "network"
  | "server"
  | "unknown";

export class PlatformError extends Error {
  readonly code: PlatformErrorCode;
  readonly status: number;
  readonly traceId?: string;
  readonly details: Array<{ code?: string; message: string; field?: string }>;

  constructor(
    message: string,
    opts: {
      code: PlatformErrorCode;
      status?: number;
      traceId?: string;
      details?: Array<{ code?: string; message: string; field?: string }>;
    }
  ) {
    super(message);
    this.name = "PlatformError";
    this.code = opts.code;
    this.status = opts.status ?? 0;
    this.traceId = opts.traceId;
    this.details = opts.details ?? [{ message }];
  }
}

export function mapStatusToCode(status: number): PlatformErrorCode {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not_found";
  if (status === 422 || status === 400) return "validation";
  if (status >= 500) return "server";
  return "unknown";
}

export function toPlatformError(
  message: string,
  status: number,
  details?: Array<{ code?: string; message: string; field?: string }>,
  traceId?: string
): PlatformError {
  return new PlatformError(message, {
    code: mapStatusToCode(status),
    status,
    details,
    traceId,
  });
}
