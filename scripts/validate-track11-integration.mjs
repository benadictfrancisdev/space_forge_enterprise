/**
 * Track 11 — Live integration certification
 * Credential → Connection → test → discover → sync → dataset pipeline
 * Requires: npm run dev:backend:lite
 */
import {
  apiBase,
  log,
  dataOf,
  req,
  authExchange,
  ensureTenant,
} from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track11-report.mjs";

async function main() {
  console.log("Track 11 Integration Certification →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track11-integration");
  record("auth exchange", true);

  const { orgId, workspaceId } = await ensureTenant(access);
  record("tenant provisioned", !!orgId && !!workspaceId, orgId?.slice(0, 8));

  {
    const { res, json } = await req("GET", "/api/v1/connectors/", { token: access });
    const types = dataOf(json) || [];
    const typeIds = types.map((t) => t.connector_type);
    record(
      "connector catalog",
      res.ok && typeIds.includes("platform.echo") && typeIds.includes("csv") && typeIds.includes("excel") && typeIds.includes("rest_api") && typeIds.includes("postgresql") && typeIds.includes("mysql") && typeIds.includes("sqlserver") && typeIds.includes("mongodb") && typeIds.includes("aws_s3") && typeIds.includes("airtable") && typeIds.includes("shopify"),
      typeIds.join(", ")
    );
  }

  let credentialId;
  {
    const secret = `cert-secret-${Date.now()}`;
    const { res, json } = await req("POST", "/api/v1/credentials/", {
      token: access,
      body: {
        organization_id: orgId,
        name: "Track11 Cert Credential",
        auth_method: "password",
        payload: { username: "cert_user", password: secret },
      },
    });
    const data = dataOf(json);
    const bodyText = JSON.stringify(json);
    credentialId = data?.id;
    const permissionOk = res.status !== 403;
    record(
      "credential create (secrets stripped)",
      res.ok && !!credentialId && !bodyText.includes(secret) && !bodyText.includes("cert_user"),
      res.ok
        ? credentialId?.slice(0, 8)
        : permissionOk
          ? `HTTP ${res.status}`
          : "run: python manage.py seed_platform (credential:write missing)"
    );
  }

  let connectionId;
  {
    const { res, json } = await req("POST", "/api/v1/connections/", {
      token: access,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        name: "Track11 Echo Connection",
        connector_type: "platform.echo",
        config: { message: "track11-cert", row_count: 5 },
        ...(credentialId ? { credential_id: credentialId } : {}),
        sync_schedule: "manual",
      },
    });
    const data = dataOf(json);
    connectionId = data?.id;
    const bodyText = JSON.stringify(json);
    record(
      "connection create",
      res.ok && !!connectionId && !bodyText.includes("cert-secret"),
      connectionId?.slice(0, 8)
    );
  }

  {
    const { res, json } = await req("POST", `/api/v1/connections/${connectionId}/test/`, {
      token: access,
      body: {},
    });
    const data = dataOf(json);
    record(
      "connector.test job",
      res.ok && data?.job?.status === "succeeded" && data?.job?.result?.ok === true,
      data?.connection?.health_status
    );
  }

  {
    const { res, json } = await req("POST", `/api/v1/connections/${connectionId}/discover/`, {
      token: access,
      body: {},
    });
    const data = dataOf(json);
    const tables = data?.schema?.tables || [];
    record(
      "connector.discover job",
      res.ok && data?.job?.status === "succeeded" && tables.length > 0,
      `tables=${tables.length} v=${data?.schema?.version}`
    );
  }

  {
    const { res, json } = await req("GET", `/api/v1/connections/${connectionId}/schema/`, {
      token: access,
    });
    const data = dataOf(json);
    record("schema snapshot GET", res.ok && (data?.tables?.length || 0) > 0, `v=${data?.version}`);
  }

  let datasetId;
  {
    const { res, json } = await req("POST", `/api/v1/connections/${connectionId}/sync/`, {
      token: access,
      body: { mode: "full", batch_size: 2 },
    });
    const data = dataOf(json);
    datasetId = data?.connection?.target_dataset_id;
    record(
      "connector.sync job",
      res.ok &&
        data?.job?.status === "succeeded" &&
        data?.sync_run?.status === "succeeded" &&
        data?.sync_run?.rows_loaded === 5 &&
        !!datasetId,
      `rows=${data?.sync_run?.rows_loaded}`
    );
  }

  {
    const { res, json } = await req("GET", `/api/v1/connections/${connectionId}/sync-runs/`, {
      token: access,
    });
    const runs = dataOf(json) || [];
    record("sync runs history", res.ok && runs.length >= 1 && runs[0]?.rows_loaded === 5, `runs=${runs.length}`);
  }

  {
    const { res, json } = await req("GET", `/api/v1/datasets/${datasetId}/`, { token: access });
    const data = dataOf(json);
    record(
      "dataset materialized",
      res.ok && data?.row_count === 5 && data?.profile_status === "ready",
      `rows=${data?.row_count}`
    );
  }

  {
    const { res, json } = await req("POST", `/api/v1/connectors/test/`, {
      token: access,
      body: {
        organization_id: orgId,
        connector_type: "platform.echo",
        config: { message: "draft", row_count: 1 },
      },
    });
    const data = dataOf(json);
    record("connector draft test", res.ok && data?.ok === true, data?.message);
  }

  const path = writePhaseReport(
    "integration",
    { passed: checks.length - failed, failed, total: checks.length },
    checks
  );

  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 11 integration certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
