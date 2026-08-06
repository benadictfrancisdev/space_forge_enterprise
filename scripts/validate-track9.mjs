/**
 * Track 9.1 — Functional Certification Harness
 * Requires backend lite: npm run dev:backend:lite
 *
 * Usage:
 *   npm run validate:track9
 *   VITE_API_BASE_URL=http://localhost:8000 npm run validate:track9
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  FUNCTIONAL_CERT_MATRIX,
  IBI_MODULES,
} from "./lib/track9-functional-matrix.mjs";
import {
  apiBase,
  log,
  logSkip,
  dataOf,
  req,
  ensureTenant,
  uploadProfiledDataset,
  aiEnvelopeOk,
} from "./lib/track9-http.mjs";

/** @type {Record<string, { status: string, detail?: string }>} */
const results = {};

function record(id, status, detail = "") {
  results[id] = { status, detail };
}

async function testAiOperation(token, orgId, datasetId, operation, bodyExtra = {}) {
  const { res, json } = await req("POST", `/api/v1/ai/${operation}/`, {
    token,
    body: {
      organization_id: orgId,
      dataset_id: datasetId,
      question: "What stands out?",
      message: "Summarize key metrics",
      query: "top revenue region",
      hypothesis: "Revenue differs by region",
      horizon: 5,
      ...bodyExtra,
    },
  });
  const d = dataOf(json);
  return res.ok && aiEnvelopeOk(d);
}

async function main() {
  console.log("Track 9.1 Functional Certification →", apiBase());
  console.log(`Modules in matrix: ${FUNCTIONAL_CERT_MATRIX.length}\n`);

  let failed = 0;
  let passed = 0;
  let skipped = 0;

  // Auth
  let access;
  {
    const { res, json } = await req("POST", "/api/v1/auth/exchange/", {
      body: { token: "dev:track9:track9@spaceforge.local", device_label: "validate-t9" },
    });
    access = dataOf(json)?.access_token;
    const ok = res.ok && !!access;
    log("auth exchange", ok);
    if (!ok) process.exit(1);
  }

  let orgId;
  let workspaceId;
  let datasetId;
  let dataset;
  try {
    ({ orgId, workspaceId } = await ensureTenant(access));
    log("tenant ready", true, `${orgId?.slice(0, 8)}…`);
    ({ datasetId, dataset } = await uploadProfiledDataset(access, orgId, workspaceId));
    log("upload pipeline (storage→dataset→profile)", true, `rows=${dataset.row_count}`);
  } catch (e) {
    log("setup pipeline", false, e.message);
    process.exit(1);
  }

  // Per-module certification
  for (const mod of FUNCTIONAL_CERT_MATRIX) {
    const label = `${mod.group} / ${mod.label}`;
    try {
      if (mod.mode === "local") {
        logSkip(label, "local-first — manual UI verification required");
        record(mod.id, "SKIP", "local-first");
        skipped++;
        continue;
      }

      if (mod.id === "upload") {
        const ok = !!datasetId && dataset?.profile_status === "ready";
        log(label, ok, mod.id);
        record(mod.id, ok ? "PASS" : "FAIL");
        ok ? passed++ : failed++;
        continue;
      }

      if (mod.id === "preview" || mod.id === "power_bi" || mod.id === "visualize") {
        const { res, json } = await req("GET", `/api/v1/datasets/${datasetId}/`, { token: access });
        const d = dataOf(json);
        const ok = res.ok && d?.row_count > 0 && (d?.schema?.columns?.length || 0) > 0;
        log(label, ok, `cols=${d?.schema?.columns?.length}`);
        record(mod.id, ok ? "PASS" : "FAIL");
        ok ? passed++ : failed++;
        continue;
      }

      if (
        mod.id === "analyze" ||
        mod.id === "master_dashboard" ||
        mod.id === "kpi_cards"
      ) {
        const { res, json } = await req("GET", `/api/v1/datasets/${datasetId}/statistics/`, {
          token: access,
        });
        const d = dataOf(json);
        const cols = d?.statistics?.columns || {};
        const ok = res.ok && d?.profile_status === "ready" && Object.keys(cols).length > 0;
        log(label, ok, `columns=${Object.keys(cols).length}`);
        record(mod.id, ok ? "PASS" : "FAIL");
        ok ? passed++ : failed++;
        continue;
      }

      if (mod.id === "system_status") {
        const h1 = await req("GET", "/health/");
        const h2 = await req("GET", "/api/v1/ai/health/");
        const d2 = dataOf(h2.json);
        const ok =
          h1.res.ok &&
          h2.res.ok &&
          h2.json?.success !== false &&
          d2?.status === "ok" &&
          Array.isArray(d2?.operations);
        log(label, ok, `ops=${d2?.operations?.length}`);
        record(mod.id, ok ? "PASS" : "FAIL");
        ok ? passed++ : failed++;
        continue;
      }

      if (mod.id === "report") {
        const sci = await testAiOperation(access, orgId, datasetId, "scientist");
        const exp = await req("GET", `/api/v1/datasets/${datasetId}/export/`, { token: access });
        const ok = sci && exp.res.ok && !!dataOf(exp.json)?.dataset_id;
        log(label, ok, mod.id);
        record(mod.id, ok ? "PASS" : "FAIL");
        ok ? passed++ : failed++;
        continue;
      }

      if (mod.id.startsWith("ibi_")) {
        const ibiModule = IBI_MODULES[mod.id];
        const { res, json } = await req("POST", "/api/v1/ai/indian-intel/", {
          token: access,
          body: {
            organization_id: orgId,
            dataset_id: datasetId,
            module: ibiModule,
          },
        });
        const d = dataOf(json);
        const ok = res.ok && aiEnvelopeOk(d);
        log(label, ok, `module=${ibiModule}`);
        record(mod.id, ok ? "PASS" : "FAIL");
        ok ? passed++ : failed++;
        continue;
      }

      if (mod.aiOperation) {
        const extra =
          mod.aiOperation === "forecast" || mod.id === "forecast_chat"
            ? { horizon: 7 }
            : {};
        const ok = await testAiOperation(access, orgId, datasetId, mod.aiOperation, extra);
        log(label, ok, mod.aiOperation);
        record(mod.id, ok ? "PASS" : "FAIL");
        ok ? passed++ : failed++;
        continue;
      }

      logSkip(label, "no automated test mapped");
      record(mod.id, "SKIP", "unmapped");
      skipped++;
    } catch (e) {
      log(label, false, e.message);
      record(mod.id, "FAIL", e.message);
      failed++;
    }
  }

  // Write machine-readable report
  const reportDir = join(process.cwd(), "docs", "sprint-1", "reports");
  try {
    mkdirSync(reportDir, { recursive: true });
  } catch {
    /* exists */
  }
  const report = {
    track: "9.1",
    generated_at: new Date().toISOString(),
    api: apiBase(),
    summary: { passed, failed, skipped, total: FUNCTIONAL_CERT_MATRIX.length },
    modules: FUNCTIONAL_CERT_MATRIX.map((m) => ({
      id: m.id,
      label: m.label,
      group: m.group,
      mode: m.mode,
      status: results[m.id]?.status || "UNKNOWN",
      detail: results[m.id]?.detail || "",
    })),
  };
  const reportPath = join(reportDir, "track9-functional-latest.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log("\n--- Track 9.1 Summary ---");
  console.log(`PASS: ${passed}  FAIL: ${failed}  SKIP: ${skipped}  TOTAL: ${FUNCTIONAL_CERT_MATRIX.length}`);
  console.log(`Report: ${reportPath}`);

  if (failed > 0) process.exit(1);
  console.log("\nTrack 9.1 functional certification complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
