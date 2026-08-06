/**
 * Track 9.3 — AI Platform Certification
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
  timed,
} from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track9-report.mjs";

const OPS = ["chat", "forecast", "scientist", "hypothesis", "nlp", "narrative", "anomaly", "decisions", "indian-intel"];
const IBI = ["churn", "inventory", "revenue_drop", "segmentation", "sales_performance"];

function strictEnvelope(data) {
  if (!aiEnvelopeOk(data)) return false;
  return (
    typeof data.result === "object" &&
    data.result !== null &&
    (data.result.summary || data.result.details) &&
    data.metadata?.schema_version === "ai@v1" &&
    typeof data.evaluation?.confidence === "number"
  );
}

async function main() {
  console.log("Track 9.3 AI Certification →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track9-ai");
  const { orgId, workspaceId } = await ensureTenant(access);
  const { datasetId } = await uploadProfiledDataset(access, orgId, workspaceId);

  {
    const { res, json } = await req("GET", "/api/v1/ai/health/");
    const d = dataOf(json);
    record(
      "prompt registry",
      res.ok && d?.prompt_versions?.chat === "chat@v1",
      `ops=${d?.operations?.length}`
    );
  }

  for (const op of OPS) {
    const body = {
      organization_id: orgId,
      dataset_id: datasetId,
      question: "cert test",
      message: "cert",
      query: "cert",
      hypothesis: "regions differ",
      horizon: 4,
      module: "churn",
    };
    const { result: call, ms } = await timed(() =>
      req("POST", `/api/v1/ai/${op}/`, { token: access, body })
    );
    const d = dataOf(call.json);
    const ok = call.res.ok && strictEnvelope(d);
    record(`operation:${op}`, ok, `${ms}ms conf=${d?.evaluation?.confidence}`);
  }

  for (const mod of IBI) {
    const { result: call, ms } = await timed(() =>
      req("POST", "/api/v1/ai/indian-intel/", {
        token: access,
        body: { organization_id: orgId, dataset_id: datasetId, module: mod },
      })
    );
    const d = dataOf(call.json);
    record(`indian-intel:${mod}`, call.res.ok && strictEnvelope(d), `${ms}ms`);
  }

  // Consistency: same question twice should return same operation + provider
  {
    const q = { organization_id: orgId, dataset_id: datasetId, question: "What is total revenue?" };
    const a = dataOf((await req("POST", "/api/v1/ai/chat/", { token: access, body: q })).json);
    const b = dataOf((await req("POST", "/api/v1/ai/chat/", { token: access, body: q })).json);
    record(
      "consistency (provider+op)",
      a?.operation === b?.operation && a?.evaluation?.provider === b?.evaluation?.provider,
      a?.evaluation?.provider
    );
  }

  // Unsupported operation
  {
    const { res } = await req("POST", "/api/v1/ai/not-a-real-op/", {
      token: access,
      body: { organization_id: orgId },
    });
    record("unsupported op rejected", res.status === 400, String(res.status));
  }

  const path = writePhaseReport("ai", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 9.3 AI certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
