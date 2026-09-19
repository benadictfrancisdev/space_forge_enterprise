import { useEffect } from "react";

/** Keep marketing routes in light mode and off the V2 overflow lock. */
export function useMarketingTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("overflow-hidden");
  }, []);
}

/** Apply enterprise workspace overflow lock only — theme follows user preference (ThemeToggle). */
export function useV2Theme() {
  useEffect(() => {
    document.body.classList.add("overflow-hidden");

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, []);
}
