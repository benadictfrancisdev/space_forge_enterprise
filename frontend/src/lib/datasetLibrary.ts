// Lightweight client-side dataset library — keeps multiple uploaded datasets
// in localStorage so the user can switch between them and survive refreshes
// or tab switches without re-uploading.

export interface StoredDataset {
  id: string;
  name: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;       // original row count (before sampling)
  sampledRowCount: number;
  savedAt: number;
}

const LIB_KEY = "spaceforge-dataset-library";
const ACTIVE_KEY = "spaceforge-active-dataset-id";
const LEGACY_KEY = "spaceforge-decision-dataset";
const MAX_ROWS = 5000;
const MAX_DATASETS = 8;

const safeParse = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
};

export const listDatasets = (): StoredDataset[] => {
  if (typeof window === "undefined") return [];
  return safeParse<StoredDataset[]>(localStorage.getItem(LIB_KEY)) ?? [];
};

export const getActiveDatasetId = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
};

export const getActiveDataset = (): StoredDataset | null => {
  const id = getActiveDatasetId();
  if (!id) return null;
  return listDatasets().find(d => d.id === id) ?? null;
};

const writeLibrary = (items: StoredDataset[]) => {
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(items));
  } catch {
    // quota — drop oldest until it fits
    const trimmed = items.slice(-Math.max(1, items.length - 1));
    try { localStorage.setItem(LIB_KEY, JSON.stringify(trimmed)); } catch { /* give up */ }
  }
};

const writeLegacyMirror = (active: StoredDataset | null) => {
  try {
    if (!active) {
      localStorage.removeItem(LEGACY_KEY);
      sessionStorage.removeItem(LEGACY_KEY);
      return;
    }
    const payload = JSON.stringify({
      datasetName: active.name,
      columns: active.columns,
      rowCount: active.rowCount,
      sampledRowCount: active.sampledRowCount,
      rows: active.rows,
    });
    localStorage.setItem(LEGACY_KEY, payload);
    sessionStorage.setItem(LEGACY_KEY, payload);
  } catch { /* ignore */ }
};

export const saveDataset = (input: {
  id?: string;
  name: string;
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount?: number;
}): StoredDataset => {
  const sampled = input.rows.length > MAX_ROWS ? input.rows.slice(0, MAX_ROWS) : input.rows;
  const id = input.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const record: StoredDataset = {
    id,
    name: input.name,
    columns: input.columns,
    rows: sampled,
    rowCount: input.rowCount ?? input.rows.length,
    sampledRowCount: sampled.length,
    savedAt: Date.now(),
  };
  const existing = listDatasets().filter(d => d.id !== id && d.name !== input.name);
  const next = [...existing, record].slice(-MAX_DATASETS);
  writeLibrary(next);
  setActiveDataset(id);
  return record;
};

export const setActiveDataset = (id: string | null) => {
  if (typeof window === "undefined") return;
  if (!id) {
    localStorage.removeItem(ACTIVE_KEY);
    writeLegacyMirror(null);
    return;
  }
  localStorage.setItem(ACTIVE_KEY, id);
  const active = listDatasets().find(d => d.id === id) ?? null;
  writeLegacyMirror(active);
};

export const removeDataset = (id: string): StoredDataset | null => {
  const items = listDatasets();
  const next = items.filter(d => d.id !== id);
  writeLibrary(next);
  const wasActive = getActiveDatasetId() === id;
  if (wasActive) {
    const fallback = next[next.length - 1] ?? null;
    setActiveDataset(fallback?.id ?? null);
    return fallback;
  }
  return getActiveDataset();
};

export const clearAllDatasets = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LIB_KEY);
  localStorage.removeItem(ACTIVE_KEY);
  writeLegacyMirror(null);
};
