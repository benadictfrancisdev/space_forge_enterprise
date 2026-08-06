/**
 * Track 9.2 — End-to-End Integration Certification
 * Upload → Storage → Dataset → Profile → Statistics → AI → Export → Job pipeline
 */
import {
  apiBase,
  log,
  dataOf,
  req,
  authExchange,
  ensureTenant,
  uploadProfiledDataset,
  aiEnvelopeOk,
} from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track9-report.mjs";

async function main() {
  console.log("Track 9.2 Integration Certification →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track9-integration");
  record("auth exchange", true);

  const { orgId, workspaceId } = await ensureTenant(access);
  record("tenant provisioned", !!orgId && !!workspaceId, orgId?.slice(0, 8));

  const { datasetId, dataset } = await uploadProfiledDataset(access, orgId, workspaceId);
  record("upload→storage→dataset→profile", dataset.profile_status === "ready", `rows=${dataset.row_count}`);

  {
    const { res, json } = await req("GET", `/api/v1/datasets/${datasetId}/statistics/`, { token: access });
    const d = dataOf(json);
    record("statistics stage", res.ok && d?.statistics?.columns, `cols=${Object.keys(d?.statistics?.columns || {}).length}`);
  }

  {
    const { res, json } = await req("POST", "/api/v1/ai/chat/", {
      token: access,
      body: { organization_id: orgId, dataset_id: datasetId, question: "Summarize revenue by region" },
    });
    record("AI analysis stage", res.ok && aiEnvelopeOk(dataOf(json)), "chat");
  }

  {
    const { res, json } = await req("POST", "/api/v1/ai/decisions/", {
      token: access,
      body: { organization_id: orgId, dataset_id: datasetId },
    });
    record("decision intelligence stage", res.ok && aiEnvelopeOk(dataOf(json)), "decisions");
  }

  {
    const { res, json } = await req("GET", `/api/v1/datasets/${datasetId}/export/`, { token: access });
    const d = dataOf(json);
    record("export manifest stage", res.ok && d?.dataset_id === datasetId, d?.name);
  }

  {
    const { res, json } = await req("POST", "/api/v1/jobs/", {
      token: access,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        job_type: "dataset.pipeline",
        payload: { dataset_id: datasetId, horizon: 3 },
        timeout_seconds: 300,
      },
    });
    const d = dataOf(json);
    const outputs = d?.result?.outputs || {};
    record(
      "job pipeline stage",
      res.ok && d?.status === "succeeded" && !!outputs.forecast,
      `stages=${(d?.result?.stages || []).join(",")}`
    );
  }

  // Invalid input path
  {
    const { res } = await req("POST", "/api/v1/datasets/", {
      token: access,
      body: { organization_id: orgId, workspace_id: workspaceId, name: "" },
    });
    record("invalid dataset rejected", res.status === 400, String(res.status));
  }

  const path = writePhaseReport("integration", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 9.2 integration certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
