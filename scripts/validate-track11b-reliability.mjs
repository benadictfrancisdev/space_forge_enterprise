/**
 * Track 11B.9 — Integration platform reliability certification
 * Requires: npm run dev:backend:lite
 */
import { apiBase, log, dataOf, req, authExchange, ensureTenant } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track11b-report.mjs";

async function main() {
  console.log("Track 11B.9 Reliability Certification →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track11b-reliability");
  const { orgId, workspaceId } = await ensureTenant(access);

  // Unknown connector fails cleanly
  let badConnId;
  {
    const { res, json } = await req("POST", "/api/v1/connections/", {
      token: access,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        name: "Bad Connector",
        connector_type: "snowflake",
        config: { account: "missing" },
      },
    });
    badConnId = dataOf(json)?.id;
    record("unknown connector connection created", res.ok && !!badConnId);
  }

  {
    const { res, json } = await req("POST", `/api/v1/connections/${badConnId}/sync/`, {
      token: access,
      body: { mode: "full" },
    });
    const data = dataOf(json);
    const failedCleanly =
      res.status === 202
        ? data?.job?.status === "failed" && data?.sync_run?.status === "failed"
        : res.status >= 400;
    record(
      "sync failure recorded",
      failedCleanly,
      data?.sync_run?.status || String(res.status)
    );
  }

  {
    const { res, json } = await req(
      "GET",
      `/api/v1/ops/connectors/failures/?organization_id=${orgId}`,
      { token: access }
    );
    const failures = dataOf(json)?.failures || [];
    record("failure diagnostics visible", res.ok && Array.isArray(failures));
  }

  // Retry path after healthy connection
  let goodConnId;
  {
    const { res, json } = await req("POST", "/api/v1/connections/", {
      token: access,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        name: "Retry Echo",
        connector_type: "platform.echo",
        config: { message: "retry", row_count: 3 },
      },
    });
    goodConnId = dataOf(json)?.id;
    record("retry connection created", res.ok && !!goodConnId);
  }

  {
    const { res, json } = await req("POST", `/api/v1/connections/${goodConnId}/sync/`, {
      token: access,
      body: { mode: "full", batch_size: 10 },
    });
    const data = dataOf(json);
    record("retry sync succeeds", res.ok && data?.sync_run?.status === "succeeded", `rows=${data?.sync_run?.rows_loaded}`);
  }

  // Incremental cursor resume
  {
    await req("PATCH", `/api/v1/connections/${goodConnId}/`, {
      token: access,
      body: { config: { message: "retry", row_count: 6 } },
    });
    const { res, json } = await req("POST", `/api/v1/connections/${goodConnId}/sync/`, {
      token: access,
      body: { mode: "incremental", batch_size: 10 },
    });
    const data = dataOf(json);
    record(
      "incremental cursor resume",
      res.ok && data?.sync_run?.status === "succeeded" && data?.sync_run?.rows_loaded === 3,
      `rows=${data?.sync_run?.rows_loaded}`
    );
  }

  {
    const { res, json } = await req("GET", `/api/v1/connections/${goodConnId}/sync-runs/`, {
      token: access,
    });
    const runs = dataOf(json) || [];
    record("sync history preserved", res.ok && runs.length >= 2, `runs=${runs.length}`);
  }

  const path = writePhaseReport(
    "reliability",
    { passed: checks.length - failed, failed, total: checks.length },
    checks
  );
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 11B.9 reliability certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
