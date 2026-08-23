import { useEffect } from "react";

/** Keep marketing routes in light mode and off the V2 overflow lock. */
export function useMarketingTheme() {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("overflow-hidden");
  }, []);
}

/** Apply enterprise dark shell only while V2 routes are mounted. */
export function useV2Theme() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("overflow-hidden");

    return () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("overflow-hidden");
    };
  }, []);
}
