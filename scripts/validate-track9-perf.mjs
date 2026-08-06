/**
 * Track 9.7 — Performance Certification
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import {
  apiBase,
  log,
  dataOf,
  req,
  authExchange,
  ensureTenant,
  uploadProfiledDataset,
  timed,
} from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track9-report.mjs";

const TARGETS = {
  datasetListMs: 500,
  aiChatMs: 2000,
  profileEnqueueMs: 1000,
  largestChunkKb: 500,
};

function gzipSizeKb(path) {
  return Math.round(gzipSync(readFileSync(path)).length / 1024);
}

async function main() {
  console.log("Track 9.7 Performance Certification →", apiBase());
  const checks = [];
  const baselines = {};
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  // Bundle baseline
  const dist = join(process.cwd(), "frontend", "dist", "assets");
  try {
    const files = readdirSync(dist).filter((f) => f.endsWith(".js"));
    const sizes = files.map((f) => ({ name: f, kb: gzipSizeKb(join(dist, f)) })).sort((a, b) => b.kb - a.kb);
    const largest = sizes[0];
    baselines.largestChunkKb = largest.kb;
    baselines.largestChunk = largest.name;
    record("bundle largest chunk", largest.kb <= TARGETS.largestChunkKb, `${largest.name}=${largest.kb}KB`);
  } catch {
    record("bundle build exists", false, "run npm run build first");
    failed++;
  }

  const access = await authExchange("track9-perf");
  const { orgId, workspaceId } = await ensureTenant(access);
  const { datasetId } = await uploadProfiledDataset(access, orgId, workspaceId);

  {
    const { ms } = await timed(() =>
      req("GET", `/api/v1/datasets/?organization_id=${orgId}&page=1&page_size=25`, { token: access })
    );
    baselines.datasetListMs = ms;
    record("dataset list p95 target", ms <= TARGETS.datasetListMs, `${ms}ms`);
  }

  {
    const { ms } = await timed(() =>
      req("POST", "/api/v1/ai/chat/", {
        token: access,
        body: { organization_id: orgId, dataset_id: datasetId, question: "perf test" },
      })
    );
    baselines.aiChatMs = ms;
    record("ai chat latency", ms <= TARGETS.aiChatMs, `${ms}ms`);
  }

  {
    const form = new FormData();
    form.append("organization_id", orgId);
    form.append("workspace_id", workspaceId);
    form.append("file", new Blob(["a,b\n1,2\n"], { type: "text/csv" }), "perf.csv");
    const { result: storage } = await timed(() =>
      req("POST", "/api/v1/storage/objects/", { token: access, formData: form })
    );
    const storageId = dataOf(storage.json)?.id;
    const { result: created } = await timed(() =>
      req("POST", "/api/v1/datasets/", {
        token: access,
        body: { organization_id: orgId, workspace_id: workspaceId, name: "Perf DS", storage_object_id: storageId },
      })
    );
    const newId = dataOf(created.json)?.id;
    const { ms } = await timed(() =>
      req("POST", `/api/v1/datasets/${newId}/profile/`, { token: access })
    );
    baselines.profileEnqueueMs = ms;
    record("profile enqueue latency", ms <= TARGETS.profileEnqueueMs, `${ms}ms`);
  }

  const path = writePhaseReport(
    "performance",
    { passed: checks.length - failed, failed, total: checks.length, baselines, targets: TARGETS },
    checks
  );
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 9.7 performance certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
