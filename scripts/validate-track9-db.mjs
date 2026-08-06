/**
 * Track 9.4 — Database Certification
 */
import {
  apiBase,
  log,
  dataOf,
  req,
  authExchange,
  ensureTenant,
  timed,
} from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track9-report.mjs";

async function main() {
  console.log("Track 9.4 Database Certification →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track9-db");
  const { orgId, workspaceId } = await ensureTenant(access);

  // Bulk dataset creation for pagination
  const ids = [];
  for (let i = 0; i < 5; i++) {
    const { res, json } = await req("POST", "/api/v1/datasets/", {
      token: access,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        name: `DB Cert ${i}`,
        description: `pagination test ${i}`,
      },
    });
    if (res.ok) ids.push(dataOf(json)?.id);
  }
  record("bulk metadata create", ids.length === 5, `n=${ids.length}`);

  {
    const { result: call, ms } = await timed(() =>
      req("GET", `/api/v1/datasets/?organization_id=${orgId}&page=1&page_size=2`, { token: access })
    );
    const items = dataOf(call.json) || [];
    const meta = call.json?.meta || {};
    const lean = items[0] && !("schema" in items[0]) && !("statistics" in items[0]);
    record("pagination", call.res.ok && meta.count >= 5 && items.length === 2 && lean, `${ms}ms count=${meta.count}`);
  }

  {
    const { result: call, ms } = await timed(() =>
      req("GET", `/api/v1/jobs/?organization_id=${orgId}&page=1&page_size=10`, { token: access })
    );
    record("jobs list paginated", call.res.ok && Array.isArray(dataOf(call.json)), `${ms}ms`);
  }

  {
    const { result: call, ms } = await timed(() =>
      req("GET", `/api/v1/audit/?organization_id=${orgId}&page=1&page_size=10`, { token: access })
    );
    const items = dataOf(call.json) || [];
    record("audit list paginated", call.res.ok && items.length >= 1, `${ms}ms n=${items.length}`);
  }

  {
    const { res, json } = await req("GET", "/health/ready/");
    const body = res.ok ? json : null;
    record("database ready check", res.ok && body?.checks?.database?.ok === true);
  }

  const path = writePhaseReport("database", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 9.4 database certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
