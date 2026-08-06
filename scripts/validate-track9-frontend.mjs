/**
 * Track 9.6 — Frontend Certification (static architecture checks)
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { writePhaseReport } from "./lib/track9-report.mjs";
import { FUNCTIONAL_CERT_MATRIX } from "./lib/track9-functional-matrix.mjs";

function log(step, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${step}${detail ? " — " + detail : ""}`);
}

function read(path) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

async function main() {
  console.log("Track 9.6 Frontend Certification (static)");
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  record("nav matrix modules", FUNCTIONAL_CERT_MATRIX.length === 26, `n=${FUNCTIONAL_CERT_MATRIX.length}`);

  const navSrc = read("frontend/src/config/dataAgentNav.ts");
  record("DATA_AGENT_TAB_IDS export", navSrc.includes("DATA_AGENT_TAB_IDS"));
  record("mobile nav tab alignment", navSrc.includes("power_bi") && navSrc.includes("live_connectors"));

  const dataAgent = read("frontend/src/pages/DataAgent.tsx");
  record("URL tab sync", dataAgent.includes("searchParams") && dataAgent.includes("isValidDataAgentTab"));
  record("lazy-loaded modules", (dataAgent.match(/lazy\(/g) || []).length >= 15);

  const mobileNav = read("frontend/src/components/layout/MobileBottomNav.tsx");
  record("mobile uses shared nav config", mobileNav.includes("dataAgentNav") || mobileNav.includes("MOBILE_PRIMARY_NAV"));

  record("PlatformStates component", existsSync("frontend/src/components/platform/PlatformStates.tsx"));
  const platformStates = read("frontend/src/components/platform/PlatformStates.tsx");
  record("loading state a11y", platformStates.includes('role="status"'));
  record("error state a11y", platformStates.includes('role="alert"'));

  const wired = ["DataChat.tsx", "ProactiveAnomalyWatch.tsx", "KPIComparisonCards.tsx"];
  for (const f of wired) {
    const src = read(`frontend/src/components/data-agent/${f}`);
    record(`PlatformStates wired: ${f}`, src.includes("PlatformStates") || src.includes("PlatformLoadingState") || src.includes("PlatformEmptyState"));
  }

  record("ai envelope parser", existsSync("frontend/src/platform/aiEnvelope.ts"));
  record("ai fallbacks", existsSync("frontend/src/platform/aiFallbacks.ts"));
  record("http 401 refresh", read("frontend/src/platform/httpClient.ts").includes("X-Platform-Retry-401"));

  const path = writePhaseReport("frontend", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  console.log("\nManual: verify responsive layouts at 375px / 768px / 1280px in browser.");
  if (failed) process.exit(1);
  console.log("\nTrack 9.6 frontend certification (static) complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
