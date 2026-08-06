import { useCallback, useEffect, useState } from "react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import {
  latestFeatureHistory,
  saveFeatureHistory as saveLocalHistory,
} from "@/lib/featureHistoryStore";

export type FeatureKey =
  | "predict"
  | "nlp_engine"
  | "analyze"
  | "hypothesis"
  | "ai_scientist"
  | "visualize"
  | "power_bi"
  | "kpi_cards"
  | "master_dashboard"
  | "stakeholder_report"
  | "report"
  | "chat";

export interface FeatureHistoryEntry {
  id: string;
  user_id: string;
  feature: FeatureKey | string;
  dataset_name: string | null;
  input_summary: Record<string, unknown>;
  output: unknown;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

const LS_PREFIX = "spaceforge:fh:";

function lsKey(feature: string, datasetName?: string) {
  return `${LS_PREFIX}${feature}:${datasetName || "_"}`;
}

function readLatestLocal(feature: string, datasetName?: string): FeatureHistoryEntry | null {
  try {
    const raw = localStorage.getItem(lsKey(feature, datasetName));
    if (!raw) return null;
    return JSON.parse(raw) as FeatureHistoryEntry;
  } catch {
    return null;
  }
}

function writeLatestLocal(entry: FeatureHistoryEntry) {
  try {
    localStorage.setItem(
      lsKey(entry.feature, entry.dataset_name || undefined),
      JSON.stringify(entry),
    );
  } catch {
    /* quota */
  }
}

async function callHistory<T = unknown>(
  body: Record<string, unknown>,
): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const { data, error } = await backend.functions.invoke("feature-history", { body });
    if (error) return { ok: false, data: null, error: error.message };
    if (data && typeof data === "object" && "success" in data) {
      const res = data as { success: boolean; data?: T; error?: string };
      return { ok: !!res.success, data: (res.data ?? null) as T | null, error: res.error };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    return { ok: false, data: null, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Persist & restore AI feature outputs per (user, feature, dataset).
 * Track 8.1: local-first store via feature-history handler (works with or without Django).
 */
export function useFeatureHistory(feature: FeatureKey | string, datasetName?: string) {
  const { user } = useAuth();
  const [latest, setLatest] = useState<FeatureHistoryEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const local =
      readLatestLocal(feature, datasetName) ||
      latestFeatureHistory(feature, datasetName, user?.id);
    if (local && !cancelled) setLatest(local);

    if (user?.id) {
      (async () => {
        const res = await callHistory<FeatureHistoryEntry | null>({
          action: "latest",
          feature,
          dataset_name: datasetName,
          userId: user.id,
        });
        if (!cancelled && res.ok && res.data) {
          setLatest(res.data);
          writeLatestLocal(res.data);
        }
        if (!cancelled) setLoading(false);
      })();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user?.id, feature, datasetName]);

  const save = useCallback(
    async (output: unknown, inputSummary: Record<string, unknown> = {}) => {
      const uid = user?.id || "anon";
      const entry = saveLocalHistory({
        userId: uid,
        feature,
        datasetName,
        inputSummary,
        output,
      });
      writeLatestLocal(entry);
      setLatest(entry);

      if (user?.id) {
        const res = await callHistory<FeatureHistoryEntry>({
          action: "save",
          feature,
          dataset_name: datasetName,
          input_summary: inputSummary,
          output,
          userId: user.id,
        });
        if (res.ok && res.data) {
          setLatest(res.data);
          writeLatestLocal(res.data);
        }
      }
      return entry;
    },
    [user?.id, feature, datasetName],
  );

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(lsKey(feature, datasetName));
    } catch {
      /* ignore */
    }
    setLatest(null);
  }, [feature, datasetName]);

  return { latest, loading, save, clear };
}

export function useFeatureHistoryList() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<FeatureHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await callHistory<FeatureHistoryEntry[]>({
      action: "list",
      userId: user?.id || "anon",
    });
    if (res.ok && Array.isArray(res.data)) {
      setEntries(res.data);
    } else if (user?.id) {
      const { listFeatureHistory } = await import("@/lib/featureHistoryStore");
      setEntries(listFeatureHistory(user.id));
    } else {
      setEntries([]);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const togglePin = useCallback(
    async (id: string, pinned: boolean) => {
      await callHistory({ action: "pin", id, pinned, userId: user?.id || "anon" });
      refresh();
    },
    [refresh, user?.id],
  );

  const remove = useCallback(
    async (id: string) => {
      await callHistory({ action: "delete", id, userId: user?.id || "anon" });
      refresh();
    },
    [refresh, user?.id],
  );

  return { entries, loading, refresh, togglePin, remove };
}
