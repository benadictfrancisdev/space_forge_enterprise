import { useState, useEffect, useCallback } from "react";
import { backend } from "@/platform";
import { useAuth } from "./useAuth";

export interface MemoryEntry {
  id: string;
  contextType: string;
  title: string;
  content: Record<string, unknown>;
  datasetName: string | null;
  tags: string[];
  importance: string;
  createdAt: string;
}

export const useDataMemory = (datasetName?: string) => {
  const { user } = useAuth();
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMemories = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = backend
        .from("business_context_memory")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (datasetName) {
        query = query.or(`dataset_name.eq.${datasetName},dataset_name.is.null`);
      }

      const { data, error } = await query;
      if (error) throw error;

      setMemories(
        (data || []).map((m) => ({
          id: m.id,
          contextType: m.context_type,
          title: m.title,
          content: m.content as Record<string, unknown>,
          datasetName: m.dataset_name,
          tags: m.tags || [],
          importance: m.importance || "medium",
          createdAt: m.created_at,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch memories:", err);
    } finally {
      setLoading(false);
    }
  }, [user, datasetName]);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const saveMemory = useCallback(async (entry: {
    contextType: string;
    title: string;
    content: Record<string, unknown>;
    datasetName?: string;
    tags?: string[];
    importance?: string;
  }) => {
    if (!user) return null;
    try {
      const { data, error } = await backend
        .from("business_context_memory")
        .insert([{
          user_id: user.id,
          context_type: entry.contextType,
          title: entry.title,
          content: entry.content as any,
          dataset_name: entry.datasetName || datasetName || null,
          tags: entry.tags || [],
          importance: entry.importance || "medium",
        }])
        .select()
        .single();

      if (error) throw error;
      await fetchMemories();
      return data;
    } catch (err) {
      console.error("Failed to save memory:", err);
      return null;
    }
  }, [user, datasetName, fetchMemories]);

  const getContextForPrompt = useCallback(() => {
    if (memories.length === 0) return "";
    const relevant = memories.slice(0, 10);
    return `\n\nPrevious analysis context for this user/dataset:\n${relevant
      .map((m) => `- [${m.contextType}] ${m.title}: ${JSON.stringify(m.content).slice(0, 200)}`)
      .join("\n")}`;
  }, [memories]);

  return { memories, loading, saveMemory, fetchMemories, getContextForPrompt };
};
