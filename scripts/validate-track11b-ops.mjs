/**
 * Track 11B.8 — Connector Operations Dashboard Certification
 * Requires: npm run dev:backend:lite
 */
import { apiBase, log, dataOf, req, authExchange, ensureTenant } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track11b-report.mjs";

async function main() {
  console.log("Track 11B.8 Connector Ops →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track11b-ops");
  const { orgId, workspaceId } = await ensureTenant(access);

  {
    const { res, json } = await req(
      "GET",
      `/api/v1/ops/connectors/summary/?organization_id=${orgId}`,
      { token: access }
    );
    const d = dataOf(json);
    record(
      "connectors summary endpoint",
      res.ok && typeof d?.connections_total === "number",
      `connections=${d?.connections_total}`
    );
    record("sync success_rate_pct", res.ok && typeof d?.sync?.success_rate_pct === "number");
    record("by_connector_type rollup", res.ok && typeof d?.by_connector_type === "object");
  }

  {
    const conn = dataOf(
      (
        await req("POST", "/api/v1/connections/", {
          token: access,
          body: {
            organization_id: orgId,
            workspace_id: workspaceId,
            name: "Ops Echo",
            connector_type: "platform.echo",
            config: { message: "ops-cert", row_count: 4 },
          },
        })
      ).json
    );
    await req("POST", `/api/v1/connections/${conn.id}/test/`, { token: access });
    const synced = dataOf(
      (
        await req("POST", `/api/v1/connections/${conn.id}/sync/`, {
          token: access,
          body: { mode: "full", batch_size: 10 },
        })
      ).json
    );
    record(
      "echo sync for ops dashboard",
      synced?.sync_run?.status === "succeeded" && synced?.sync_run?.rows_loaded === 4,
      `rows=${synced?.sync_run?.rows_loaded}`
    );
  }

  {
    const { res, json } = await req(
      "GET",
      `/api/v1/ops/connectors/summary/?organization_id=${orgId}`,
      { token: access }
    );
    const d = dataOf(json);
    record(
      "summary reflects sync activity",
      res.ok && d?.sync?.succeeded >= 1 && d?.sync?.rows_loaded_total >= 4,
      `succeeded=${d?.sync?.succeeded}`
    );
    const row = (d?.connections || []).find((c) => c.name === "Ops Echo");
    record(
      "per-connection dashboard row",
      !!row && row.health_status === "healthy" && row.sync_runs_total >= 1,
      row?.health_status
    );
  }

  {
    const { res, json } = await req(
      "GET",
      `/api/v1/ops/connectors/failures/?organization_id=${orgId}`,
      { token: access }
    );
    const d = dataOf(json);
    record("failures endpoint", res.ok && Array.isArray(d?.failures));
  }

  {
    const { res, json } = await req("GET", `/api/v1/ops/summary/?organization_id=${orgId}`, {
      token: access,
    });
    const d = dataOf(json);
    record("ops summary includes connectors", res.ok && d?.connectors?.connections_total >= 1);
  }

  const path = writePhaseReport("ops", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 11B.8 connector ops certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
