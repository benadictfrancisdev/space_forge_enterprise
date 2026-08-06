import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Sends a GA4 page_view event on every route change.
 * GA4 only fires page_view on initial load for SPAs — this fills the gap.
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    if (window.gtag) {
      window.gtag("config", "G-MH0F7C6CZ5", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);
}
