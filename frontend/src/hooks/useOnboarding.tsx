import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { backend } from "@/platform";

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target: string | null;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to SpaceForge AI! ðŸŽ‰',
    description: 'Let\'s take a quick 1-minute tour to help you get started with powerful data analytics.',
    target: null,
    position: 'center'
  },
  {
    id: 'upload',
    title: 'Upload Your Data',
    description: 'Start by uploading a CSV, Excel, or JSON file. Your data is processed securely.',
    target: '[data-onboarding="upload-zone"]',
    position: 'bottom'
  },
  {
    id: 'sample-data',
    title: 'Try Sample Data',
    description: 'No data ready? Click here to load a sample dataset and explore all features instantly.',
    target: '[data-onboarding="sample-button"]',
    position: 'right'
  },
  {
    id: 'sidebar',
    title: 'Navigate Features',
    description: 'Use the sidebar to access analysis tools, visualizations, reports, and more.',
    target: '[data-onboarding="sidebar"]',
    position: 'right'
  },
  {
    id: 'complete',
    title: 'You\'re All Set! ðŸš€',
    description: 'Start exploring your data. Use the NLP Engine to ask questions in plain English!',
    target: null,
    position: 'center'
  }
];

interface OnboardingState {
  isComplete: boolean;
  currentStep: number;
  isActive: boolean;
}

interface OnboardingContextValue {
  state: OnboardingState;
  currentStepData: OnboardingStep | null;
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  totalSteps: number;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    isComplete: true,
    currentStep: 0,
    isActive: false,
  });

  // Load onboarding state â€” localStorage is the primary source of truth
  useEffect(() => {
    const localState = localStorage.getItem('onboarding-completed');
    if (localState === 'true') {
      setState({ isComplete: true, currentStep: 0, isActive: false });
      return;
    }

    // If not completed locally, check database for logged-in users
    if (user) {
      backend
        .from('user_session_state')
        .select('state_value')
        .eq('user_id', user.id)
        .eq('state_key', 'onboarding-completed')
        .maybeSingle()
        .then(({ data }) => {
          const completed = (data?.state_value as { completed?: boolean })?.completed ?? false;
          if (completed) {
            localStorage.setItem('onboarding-completed', 'true');
            setState({ isComplete: true, currentStep: 0, isActive: false });
          } else if (localState === null) {
            // First time user â€” start onboarding only if never dismissed
            setState({ isComplete: false, currentStep: 0, isActive: true });
          }
        });
    } else if (localState === null) {
      // Non-logged-in, never seen onboarding â€” show it
      setState({ isComplete: false, currentStep: 0, isActive: true });
    }
  }, [user]);

  const saveOnboardingState = useCallback(async (completed: boolean) => {
    if (user) {
      await backend
        .from('user_session_state')
        .upsert({
          user_id: user.id,
          state_key: 'onboarding-completed',
          state_value: { completed },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,state_key'
        });
    }
    localStorage.setItem('onboarding-completed', String(completed));
  }, [user]);

  const startOnboarding = useCallback(() => {
    setState({ isComplete: false, currentStep: 0, isActive: true });
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => {
      if (prev.currentStep >= ONBOARDING_STEPS.length - 1) {
        return prev;
      }
      return { ...prev, currentStep: prev.currentStep + 1 };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => {
      if (prev.currentStep <= 0) {
        return prev;
      }
      return { ...prev, currentStep: prev.currentStep - 1 };
    });
  }, []);

  const skipOnboarding = useCallback(() => {
    setState({ isComplete: true, currentStep: 0, isActive: false });
    saveOnboardingState(true);
  }, [saveOnboardingState]);

  const completeOnboarding = useCallback(() => {
    setState({ isComplete: true, currentStep: 0, isActive: false });
    saveOnboardingState(true);
  }, [saveOnboardingState]);

  const resetOnboarding = useCallback(() => {
    setState({ isComplete: false, currentStep: 0, isActive: true });
    saveOnboardingState(false);
  }, [saveOnboardingState]);

  const currentStepData = state.isActive ? ONBOARDING_STEPS[state.currentStep] : null;

  return (
    <OnboardingContext.Provider 
      value={{ 
        state, 
        currentStepData,
        startOnboarding, 
        nextStep, 
        prevStep, 
        skipOnboarding, 
        completeOnboarding,
        resetOnboarding,
        totalSteps: ONBOARDING_STEPS.length
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

// Default value for when hook is used outside provider
const defaultOnboardingValue: OnboardingContextValue = {
  state: { isComplete: true, currentStep: 0, isActive: false },
  currentStepData: null,
  startOnboarding: () => {},
  nextStep: () => {},
  prevStep: () => {},
  skipOnboarding: () => {},
  completeOnboarding: () => {},
  resetOnboarding: () => {},
  totalSteps: ONBOARDING_STEPS.length,
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  // Return default value instead of throwing - allows component to render outside provider
  return context ?? defaultOnboardingValue;
};
