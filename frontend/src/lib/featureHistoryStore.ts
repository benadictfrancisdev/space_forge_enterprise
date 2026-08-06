/**
 * Local-first feature history store (Track 8.1).
 * Persists AI run outputs until Django history API ships in Sprint 2.
 */
import type { FeatureHistoryEntry } from "@/hooks/useFeatureHistory";

const INDEX_KEY = "spaceforge:fh:index";
const ENTRY_PREFIX = "spaceforge:fh:entry:";

function readIndex(): string[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(ids.slice(0, 500)));
  } catch {
    /* quota */
  }
}

function readEntry(id: string): FeatureHistoryEntry | null {
  try {
    const raw = localStorage.getItem(`${ENTRY_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as FeatureHistoryEntry;
  } catch {
    return null;
  }
}

function writeEntry(entry: FeatureHistoryEntry) {
  try {
    localStorage.setItem(`${ENTRY_PREFIX}${entry.id}`, JSON.stringify(entry));
    const ids = readIndex().filter((x) => x !== entry.id);
    ids.unshift(entry.id);
    writeIndex(ids);
  } catch {
    /* quota */
  }
}

export function listFeatureHistory(userId?: string): FeatureHistoryEntry[] {
  const entries = readIndex()
    .map((id) => readEntry(id))
    .filter((e): e is FeatureHistoryEntry => !!e);
  if (!userId) return entries;
  return entries.filter((e) => e.user_id === userId || e.user_id === "anon");
}

export function latestFeatureHistory(
  feature: string,
  datasetName?: string,
  userId?: string
): FeatureHistoryEntry | null {
  const list = listFeatureHistory(userId).filter((e) => e.feature === feature);
  const scoped = datasetName
    ? list.filter((e) => (e.dataset_name || "") === datasetName)
    : list;
  return scoped[0] ?? null;
}

export function saveFeatureHistory(input: {
  userId: string;
  feature: string;
  datasetName?: string;
  inputSummary?: Record<string, unknown>;
  output: unknown;
}): FeatureHistoryEntry {
  const now = new Date().toISOString();
  const entry: FeatureHistoryEntry = {
    id: crypto.randomUUID(),
    user_id: input.userId,
    feature: input.feature,
    dataset_name: input.datasetName || null,
    input_summary: input.inputSummary || {},
    output: input.output,
    pinned: false,
    created_at: now,
    updated_at: now,
  };
  writeEntry(entry);
  return entry;
}

export function pinFeatureHistory(id: string, pinned: boolean): FeatureHistoryEntry | null {
  const entry = readEntry(id);
  if (!entry) return null;
  const next = { ...entry, pinned, updated_at: new Date().toISOString() };
  writeEntry(next);
  return next;
}

export function deleteFeatureHistory(id: string): boolean {
  const entry = readEntry(id);
  if (!entry) return false;
  try {
    localStorage.removeItem(`${ENTRY_PREFIX}${id}`);
    writeIndex(readIndex().filter((x) => x !== id));
    return true;
  } catch {
    return false;
  }
}

/** Handle feature-history function invocations locally. */
export function handleFeatureHistoryInvoke(
  body: Record<string, unknown>
): { success: boolean; data?: unknown; error?: string } {
  const action = String(body.action || "");
  const userId = String(body.userId || body.user_id || "anon");

  switch (action) {
    case "list": {
      const data = listFeatureHistory(userId === "anon" ? undefined : userId);
      return { success: true, data };
    }
    case "latest": {
      const data = latestFeatureHistory(
        String(body.feature || ""),
        body.dataset_name ? String(body.dataset_name) : undefined,
        userId
      );
      return { success: true, data };
    }
    case "save": {
      const data = saveFeatureHistory({
        userId,
        feature: String(body.feature || "unknown"),
        datasetName: body.dataset_name ? String(body.dataset_name) : undefined,
        inputSummary: (body.input_summary as Record<string, unknown>) || {},
        output: body.output,
      });
      return { success: true, data };
    }
    case "pin": {
      const data = pinFeatureHistory(String(body.id || ""), !!body.pinned);
      return data ? { success: true, data } : { success: false, error: "not_found" };
    }
    case "delete": {
      const ok = deleteFeatureHistory(String(body.id || ""));
      return ok ? { success: true, data: { deleted: true } } : { success: false, error: "not_found" };
    }
    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}
