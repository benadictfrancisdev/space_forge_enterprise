import { useEffect, useState } from "react";
import { djangoApi } from "@/platform/djangoAdapter";
import { isApiConfigured } from "@/platform/httpClient";
import { useAuth } from "@/hooks/useAuth";

/**
 * Ensures org/workspace tenant exists before platform API calls (Sprint 3).
 */
export function usePlatformBootstrap() {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isApiConfigured() || !user) {
      setReady(false);
      return;
    }
    let cancelled = false;
    djangoApi.ensureTenant().then((result) => {
      if (cancelled) return;
      if (result.error) {
        setError(result.error.message);
        setReady(false);
      } else {
        setError(null);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { ready, error, apiConfigured: isApiConfigured() };
}
