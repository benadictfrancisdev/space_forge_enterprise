import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Auto-reload on stale chunk errors after deployment.
// Use sessionStorage to avoid infinite reload loops if the chunk really is missing.
const RELOAD_KEY = "__chunk_reload_attempt";
const tryReload = () => {
  try {
    const attempts = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
    if (attempts >= 2) return; // give up after 2 attempts
    sessionStorage.setItem(RELOAD_KEY, String(attempts + 1));
    window.location.reload();
  } catch {
    window.location.reload();
  }
};
// Clear counter on successful full load
window.addEventListener("load", () => {
  setTimeout(() => {
    try { sessionStorage.removeItem(RELOAD_KEY); } catch {}
  }, 4000);
});

const isChunkErr = (msg?: string) =>
  !!msg && (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("ChunkLoadError") ||
    // Stale / partially-updated vendor chunk: symbols vanish at runtime
    /\bis not defined\b/.test(msg) ||
    msg.includes("Cannot access '") ||
    msg.includes("undefined is not an object (evaluating")
  );


window.addEventListener("vite:preloadError", () => tryReload());
window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason?.message || String(e.reason || "");
  if (isChunkErr(msg)) tryReload();
});
window.addEventListener("error", (e) => {
  if (isChunkErr(e.message)) tryReload();
});

createRoot(document.getElementById("root")!).render(<App />);
