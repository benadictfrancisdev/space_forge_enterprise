import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface UserPreferences {
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  preferredChartTypes: string[];
  commonQueries: string[];
  interactionStats: {
    totalMessages: number;
    questionsAsked: number;
    visualizationsRequested: number;
    averageMessageLength: number;
  };
  uiPreferences: {
    voiceEnabled: boolean;
    autoSuggestions: boolean;
    compactMode: boolean;
    theme: 'light' | 'dark' | 'system';
  };
  lastUpdated: string;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  expertiseLevel: 'intermediate',
  preferredChartTypes: [],
  commonQueries: [],
  interactionStats: {
    totalMessages: 0,
    questionsAsked: 0,
    visualizationsRequested: 0,
    averageMessageLength: 0,
  },
  uiPreferences: {
    voiceEnabled: true,
    autoSuggestions: true,
    compactMode: false,
    theme: 'system',
  },
  lastUpdated: new Date().toISOString(),
};

const STORAGE_KEY = 'data-agent-preferences';

export const useUserPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage
  useEffect(() => {
    if (user) {
      const storageKey = `${STORAGE_KEY}-${user.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          setPreferences(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse stored preferences:', e);
        }
      }
    }
    setIsLoading(false);
  }, [user]);

  // Save preferences to localStorage
  const savePreferences = useCallback((newPrefs: Partial<UserPreferences>) => {
    if (!user) return;
    
    const updated = {
      ...preferences,
      ...newPrefs,
      lastUpdated: new Date().toISOString(),
    };
    
    setPreferences(updated);
    const storageKey = `${STORAGE_KEY}-${user.id}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
  }, [user, preferences]);

  // Track user interaction
  const trackInteraction = useCallback((type: 'message' | 'question' | 'visualization', messageLength?: number) => {
    const stats = { ...preferences.interactionStats };
    
    stats.totalMessages++;
    
    if (type === 'question') {
      stats.questionsAsked++;
    } else if (type === 'visualization') {
      stats.visualizationsRequested++;
    }
    
    if (messageLength) {
      stats.averageMessageLength = Math.round(
        (stats.averageMessageLength * (stats.totalMessages - 1) + messageLength) / stats.totalMessages
      );
    }
    
    // Auto-detect expertise level based on interaction patterns
    let expertiseLevel = preferences.expertiseLevel;
    if (stats.totalMessages > 20) {
      if (stats.averageMessageLength > 100 && stats.visualizationsRequested > 5) {
        expertiseLevel = 'expert';
      } else if (stats.totalMessages > 50 || stats.questionsAsked > 20) {
        expertiseLevel = 'intermediate';
      }
    }
    
    savePreferences({
      interactionStats: stats,
      expertiseLevel,
    });
  }, [preferences, savePreferences]);

  // Track common queries
  const trackQuery = useCallback((query: string) => {
    const commonQueries = [...preferences.commonQueries];
    
    // Add query if not already tracked (keep last 20)
    if (!commonQueries.includes(query)) {
      commonQueries.unshift(query);
      if (commonQueries.length > 20) {
        commonQueries.pop();
      }
      savePreferences({ commonQueries });
    }
  }, [preferences, savePreferences]);

  // Track preferred chart types
  const trackChartPreference = useCallback((chartType: string) => {
    const preferredChartTypes = [...preferences.preferredChartTypes];
    
    // Move to front if exists, otherwise add
    const index = preferredChartTypes.indexOf(chartType);
    if (index > -1) {
      preferredChartTypes.splice(index, 1);
    }
    preferredChartTypes.unshift(chartType);
    
    if (preferredChartTypes.length > 10) {
      preferredChartTypes.pop();
    }
    
    savePreferences({ preferredChartTypes });
  }, [preferences, savePreferences]);

  // Update UI preferences
  const updateUIPreferences = useCallback((uiPrefs: Partial<UserPreferences['uiPreferences']>) => {
    savePreferences({
      uiPreferences: { ...preferences.uiPreferences, ...uiPrefs },
    });
  }, [preferences, savePreferences]);

  // Set expertise level manually
  const setExpertiseLevel = useCallback((level: 'beginner' | 'intermediate' | 'expert') => {
    savePreferences({ expertiseLevel: level });
  }, [savePreferences]);

  // Reset preferences
  const resetPreferences = useCallback(() => {
    if (!user) return;
    setPreferences(DEFAULT_PREFERENCES);
    const storageKey = `${STORAGE_KEY}-${user.id}`;
    localStorage.removeItem(storageKey);
  }, [user]);

  return {
    preferences,
    isLoading,
    trackInteraction,
    trackQuery,
    trackChartPreference,
    updateUIPreferences,
    setExpertiseLevel,
    resetPreferences,
    savePreferences,
  };
};
