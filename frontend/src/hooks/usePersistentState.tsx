import { useState, useEffect, useCallback, useRef } from 'react';
import { backend } from "@/platform";
import { useAuth } from './useAuth';
import type { Json } from "@/platform";

interface UsePersistentStateOptions<T> {
  key: string;
  defaultValue: T;
  debounceMs?: number;
}

export function usePersistentState<T>(options: UsePersistentStateOptions<T>) {
  const { key, defaultValue, debounceMs = 1000 } = options;
  const { user } = useAuth();
  const [state, setState] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  // Load state from database
  useEffect(() => {
    const loadState = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await backend
          .from('user_session_state')
          .select('state_value')
          .eq('user_id', user.id)
          .eq('state_key', key)
          .maybeSingle();

        if (error) {
          console.error('Failed to load state:', error);
        } else if (data) {
          setState(data.state_value as T);
        }
      } catch (err) {
        console.error('Error loading persistent state:', err);
      } finally {
        setIsLoading(false);
        initialLoadDone.current = true;
      }
    };

    loadState();
  }, [user, key]);

  // Save state to database (debounced)
  const saveState = useCallback(async (newState: T) => {
    if (!user || !initialLoadDone.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save
    saveTimeoutRef.current = setTimeout(async () => {
      setIsSaving(true);
      try {
        // First try to update existing record
        const { data: existing } = await backend
          .from('user_session_state')
          .select('id')
          .eq('user_id', user.id)
          .eq('state_key', key)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await backend
            .from('user_session_state')
            .update({ state_value: JSON.parse(JSON.stringify(newState)) as Json })
            .eq('id', existing.id);
          
          if (error) console.error('Failed to update state:', error);
        } else {
          // Insert new
          const { error } = await backend
            .from('user_session_state')
            .insert([{
              user_id: user.id,
              state_key: key,
              state_value: JSON.parse(JSON.stringify(newState)) as Json,
            }]);
          
          if (error) console.error('Failed to insert state:', error);
        }
      } catch (err) {
        console.error('Error saving persistent state:', err);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);
  }, [user, key, debounceMs]);

  // Update state and trigger save
  const updateState = useCallback((newStateOrUpdater: T | ((prev: T) => T)) => {
    setState(prev => {
      const newState = typeof newStateOrUpdater === 'function' 
        ? (newStateOrUpdater as (prev: T) => T)(prev)
        : newStateOrUpdater;
      saveState(newState);
      return newState;
    });
  }, [saveState]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    setState: updateState,
    isLoading,
    isSaving,
  };
}

// Hook specifically for PowerBI dashboard state
export interface PowerBIDashboardState {
  dashboardConfig: {
    layout: string;
    showFilters: boolean;
    theme: string;
    autoRefresh: boolean;
  };
  selectedCharts: Array<{
    id: string;
    type: string;
    xAxis: string;
    yAxis: string;
    title: string;
  }>;
  transformations: Array<{
    id: string;
    type: string;
    column: string;
    value: string;
  }>;
  selectedColumns: string[];
}

export function usePowerBIState() {
  const defaultState: PowerBIDashboardState = {
    dashboardConfig: {
      layout: 'grid',
      showFilters: true,
      theme: 'default',
      autoRefresh: false,
    },
    selectedCharts: [],
    transformations: [],
    selectedColumns: [],
  };

  return usePersistentState<PowerBIDashboardState>({
    key: 'powerbi-dashboard',
    defaultValue: defaultState,
    debounceMs: 500,
  });
}

// Hook for visualization dashboard state
export interface VisualizationState {
  charts: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
  }>;
  activeChartId?: string;
}

export function useVisualizationState() {
  return usePersistentState<VisualizationState>({
    key: 'visualization-dashboard',
    defaultValue: { charts: [] },
    debounceMs: 500,
  });
}