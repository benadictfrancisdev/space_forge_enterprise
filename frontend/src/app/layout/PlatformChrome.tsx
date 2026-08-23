import { lazy, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

import { OnboardingOverlay } from "@/components/onboarding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { isV2PlatformPath } from "@/app/v2Routes";

const SpaceBotWidget = lazy(() => import("@/components/SpaceBotWidget"));

type PlatformChromeProps = {
  children?: ReactNode;
};

export function PlatformChrome({ children }: PlatformChromeProps) {
  const { pathname } = useLocation();
  const isV2Route = isV2PlatformPath(pathname);

  return (
    <>
      {!isV2Route && (
        <ErrorBoundary name="OnboardingOverlay">
          <OnboardingOverlay />
        </ErrorBoundary>
      )}
      {!isV2Route && (
        <ErrorBoundary name="SpaceBotWidget">
          <Suspense fallback={null}>
            <SpaceBotWidget />
          </Suspense>
        </ErrorBoundary>
      )}
      {children}
    </>
  );
}
