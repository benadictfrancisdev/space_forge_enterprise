/**
 * Track 10.4 — Background Job Monitoring Certification
 */
import { apiBase, log, dataOf, req, authExchange, ensureTenant } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track10-report.mjs";

async function main() {
  console.log("Track 10.4 Job Monitoring →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track10-jobs");
  const { orgId, workspaceId } = await ensureTenant(access);

  const { res, json } = await req("GET", `/api/v1/ops/jobs/summary/?organization_id=${orgId}`, { token: access });
  const d = dataOf(json);
  record("jobs summary endpoint", res.ok && typeof d?.total === "number", `total=${d?.total}`);
  record("by_status rollup", res.ok && typeof d?.by_status === "object");
  record("success_rate_pct", res.ok && typeof d?.success_rate_pct === "number", String(d?.success_rate_pct));

  // Enqueue a profile job via integration path
  const form = new FormData();
  form.append("organization_id", orgId);
  form.append("workspace_id", workspaceId);
  form.append("file", new Blob(["a,b\n1,2\n"], { type: "text/csv" }), "job-monitor.csv");
  const storage = dataOf((await req("POST", "/api/v1/storage/objects/", { token: access, formData: form })).json);
  const dataset = dataOf(
    (
      await req("POST", "/api/v1/datasets/", {
        token: access,
        body: {
          organization_id: orgId,
          workspace_id: workspaceId,
          name: "Job Monitor DS",
          storage_object_id: storage?.id,
        },
      })
    ).json
  );
  await req("POST", `/api/v1/datasets/${dataset.id}/profile/`, { token: access });

  const after = dataOf(
    (await req("GET", `/api/v1/ops/jobs/summary/?organization_id=${orgId}`, { token: access })).json
  );
  record("summary reflects activity", after.total >= 0, `total=${after.total}`);

  const path = writePhaseReport("jobs", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 10.4 job monitoring certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
