/**
 * Track 11B.9 — Integration platform performance smoke certification
 * Requires: npm run dev:backend:lite
 */
import { apiBase, log, dataOf, req, authExchange, ensureTenant } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track11b-report.mjs";

const DISCOVER_BUDGET_MS = 3000;
const SYNC_BUDGET_MS = 15000;
const ROW_COUNT = 300;

async function main() {
  console.log("Track 11B.9 Performance Certification →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track11b-perf");
  const { orgId, workspaceId } = await ensureTenant(access);

  let connectionId;
  {
    const { res, json } = await req("POST", "/api/v1/connections/", {
      token: access,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        name: "Perf Echo",
        connector_type: "platform.echo",
        config: { message: "perf", row_count: ROW_COUNT },
      },
    });
    connectionId = dataOf(json)?.id;
    record("perf connection created", res.ok && !!connectionId, connectionId?.slice(0, 8));
  }

  let discoverMs;
  {
    const t0 = performance.now();
    const { res, json } = await req("POST", `/api/v1/connections/${connectionId}/discover/`, {
      token: access,
      body: {},
    });
    discoverMs = Math.round(performance.now() - t0);
    const data = dataOf(json);
    record(
      "discover latency",
      res.ok && data?.job?.status === "succeeded" && discoverMs <= DISCOVER_BUDGET_MS,
      `${discoverMs}ms`
    );
  }

  let syncMs;
  let rowsLoaded;
  {
    const t0 = performance.now();
    const { res, json } = await req("POST", `/api/v1/connections/${connectionId}/sync/`, {
      token: access,
      body: { mode: "full", batch_size: 50 },
    });
    syncMs = Math.round(performance.now() - t0);
    const data = dataOf(json);
    rowsLoaded = data?.sync_run?.rows_loaded;
    record(
      "sync throughput smoke",
      res.ok &&
        data?.job?.status === "succeeded" &&
        rowsLoaded === ROW_COUNT &&
        syncMs <= SYNC_BUDGET_MS,
      `${rowsLoaded} rows in ${syncMs}ms`
    );
  }

  {
    const rowsPerSec = syncMs > 0 ? Math.round((rowsLoaded / syncMs) * 1000) : 0;
    record("batch pagination", rowsLoaded === ROW_COUNT, `${rowsPerSec} rows/s`);
  }

  const path = writePhaseReport(
    "performance",
    {
      passed: checks.length - failed,
      failed,
      total: checks.length,
      metrics: { discover_ms: discoverMs, sync_ms: syncMs, rows_loaded: rowsLoaded },
    },
    checks
  );
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 11B.9 performance certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
