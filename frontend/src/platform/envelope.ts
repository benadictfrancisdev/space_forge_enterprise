/**
 * Unified API response envelope — Track 2 client normalization.
 * Track 3 will make Django emit this natively.
 */

export interface ApiEnvelope<T = unknown> {
  success: boolean;
  data: T | null;
  message: string;
  errors: Array<{ code?: string; message: string; field?: string }>;
  meta: Record<string, unknown>;
}

function isEnvelope(value: unknown): value is ApiEnvelope {
  return (
    !!value &&
    typeof value === "object" &&
    "success" in value &&
    typeof (value as ApiEnvelope).success === "boolean"
  );
}

/** Normalize Django raw success OR error OR future envelope into ApiEnvelope. */
export function normalizeResponse<T = unknown>(
  body: unknown,
  httpOk: boolean,
  status: number
): ApiEnvelope<T> {
  if (isEnvelope(body)) {
    return body as ApiEnvelope<T>;
  }

  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    (body as { error: unknown }).error &&
    typeof (body as { error: unknown }).error === "object"
  ) {
    const err = (body as { error: { code?: string; message?: unknown; trace_id?: string } }).error;
    const message =
      typeof err.message === "string"
        ? err.message
        : err.message != null
          ? JSON.stringify(err.message)
          : "Request failed";
    return {
      success: false,
      data: null,
      message,
      errors: [{ code: err.code ?? `http_${status}`, message }],
      meta: err.trace_id ? { trace_id: err.trace_id } : {},
    };
  }

  if (!httpOk) {
    return {
      success: false,
      data: null,
      message: `HTTP ${status}`,
      errors: [{ code: `http_${status}`, message: `HTTP ${status}` }],
      meta: {},
    };
  }

  return {
    success: true,
    data: body as T,
    message: "",
    errors: [],
    meta: {},
  };
}
