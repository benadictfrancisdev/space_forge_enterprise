import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

export interface Snapshot {
  id: string;
  label: string;
  category: "data" | "dashboard" | "dataset";
  timestamp: Date;
  state: unknown;
  description?: string;
}

export interface RollbackAction {
  id: string;
  type: "transform" | "clean" | "delete" | "layout" | "config" | "import";
  label: string;
  category: "data" | "dashboard" | "dataset";
  timestamp: Date;
  undoFn: () => void;
  redoFn: () => void;
}

const MAX_HISTORY = 50;
const MAX_SNAPSHOTS = 20;

export const useRollback = () => {
  const [history, setHistory] = useState<RollbackAction[]>([]);
  const [redoStack, setRedoStack] = useState<RollbackAction[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const counterRef = useRef(0);

  const pushAction = useCallback((action: Omit<RollbackAction, "id" | "timestamp">) => {
    const newAction: RollbackAction = {
      ...action,
      id: `action-${++counterRef.current}-${Date.now()}`,
      timestamp: new Date(),
    };
    setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), newAction]);
    setRedoStack([]); // clear redo on new action
  }, []);

  const undo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) {
        toast.info("Nothing to undo");
        return prev;
      }
      const last = prev[prev.length - 1];
      try {
        last.undoFn();
        setRedoStack(rs => [...rs, last]);
        toast.success(`Undone: ${last.label}`);
      } catch {
        toast.error("Undo failed");
      }
      return prev.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) {
        toast.info("Nothing to redo");
        return prev;
      }
      const last = prev[prev.length - 1];
      try {
        last.redoFn();
        setHistory(h => [...h, last]);
        toast.success(`Redone: ${last.label}`);
      } catch {
        toast.error("Redo failed");
      }
      return prev.slice(0, -1);
    });
  }, []);

  const createSnapshot = useCallback((label: string, category: Snapshot["category"], state: unknown, description?: string) => {
    const snap: Snapshot = {
      id: `snap-${++counterRef.current}-${Date.now()}`,
      label,
      category,
      timestamp: new Date(),
      state: JSON.parse(JSON.stringify(state)), // deep clone
      description,
    };
    setSnapshots(prev => [...prev.slice(-(MAX_SNAPSHOTS - 1)), snap]);
    toast.success(`Snapshot saved: ${label}`);
    return snap.id;
  }, []);

  const restoreSnapshot = useCallback((snapshotId: string): unknown | null => {
    const snap = snapshots.find(s => s.id === snapshotId);
    if (!snap) {
      toast.error("Snapshot not found");
      return null;
    }
    toast.success(`Restored: ${snap.label}`);
    return JSON.parse(JSON.stringify(snap.state));
  }, [snapshots]);

  const deleteSnapshot = useCallback((snapshotId: string) => {
    setSnapshots(prev => prev.filter(s => s.id !== snapshotId));
    toast.success("Snapshot deleted");
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setRedoStack([]);
    toast.success("History cleared");
  }, []);

  return {
    history,
    redoStack,
    snapshots,
    canUndo: history.length > 0,
    canRedo: redoStack.length > 0,
    pushAction,
    undo,
    redo,
    createSnapshot,
    restoreSnapshot,
    deleteSnapshot,
    clearHistory,
  };
};
