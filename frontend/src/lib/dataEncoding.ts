/**
 * Secure data encoding utilities for dataset storage.
 * Encodes data as Base64 before storing in the database to prevent
 * raw data exposure in database logs/queries.
 */

export function encodeDataset(data: Record<string, unknown>[]): string {
  const jsonStr = JSON.stringify(data);
  return btoa(unescape(encodeURIComponent(jsonStr)));
}

export function decodeDataset(encoded: string): Record<string, unknown>[] {
  try {
    const jsonStr = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(jsonStr);
  } catch {
    // If decoding fails, the data might be stored as plain JSON (legacy)
    try {
      if (Array.isArray(JSON.parse(encoded))) {
        return JSON.parse(encoded);
      }
    } catch {
      // ignore
    }
    return [];
  }
}

export function encodeColumns(columns: string[]): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(columns))));
}

export function decodeColumns(encoded: string): string[] {
  try {
    const jsonStr = decodeURIComponent(escape(atob(encoded)));
    return JSON.parse(jsonStr);
  } catch {
    // Legacy: might be plain JSON array
    try {
      if (Array.isArray(JSON.parse(encoded))) {
        return JSON.parse(encoded);
      }
    } catch {
      // ignore
    }
    return [];
  }
}

/**
 * Detect if a value is Base64 encoded or plain JSON
 */
export function isEncoded(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  try {
    atob(value);
    return !value.startsWith('[') && !value.startsWith('{');
  } catch {
    return false;
  }
}

/**
 * Smart decode: handles both encoded and legacy plain JSON data
 */
export function smartDecodeData(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value as Record<string, unknown>[];
  if (typeof value === 'string') {
    if (isEncoded(value)) return decodeDataset(value);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return [];
}

export function smartDecodeColumns(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    if (isEncoded(value)) return decodeColumns(value);
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore
    }
  }
  return [];
}
