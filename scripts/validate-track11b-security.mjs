/**
 * Track 11B.9 — Integration platform security certification
 * Requires: npm run dev:backend:lite
 */
import { apiBase, log, dataOf, req, ensureTenant } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track11b-report.mjs";

async function main() {
  console.log("Track 11B.9 Security Certification →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const exA = await req("POST", "/api/v1/auth/exchange/", {
    body: { token: "dev:track11b-sec-a:sec-a@spaceforge.local", device_label: "11b-sec-a" },
  });
  const accessA = dataOf(exA.json)?.access_token;
  record("user A auth", exA.res.ok && !!accessA);

  const exB = await req("POST", "/api/v1/auth/exchange/", {
    body: { token: "dev:track11b-sec-b:sec-b@spaceforge.local", device_label: "11b-sec-b" },
  });
  const tokenB = dataOf(exB.json)?.access_token;
  record("user B auth", exB.res.ok && !!tokenB);

  const { orgId, workspaceId } = await ensureTenant(accessA);
  const secret = `pat-secret-${Date.now()}`;

  let credentialId;
  {
    const { res, json } = await req("POST", "/api/v1/credentials/", {
      token: accessA,
      body: {
        organization_id: orgId,
        name: "11B Security Credential",
        auth_method: "password",
        payload: { apiKey: secret },
      },
    });
    const data = dataOf(json);
    credentialId = data?.id;
    const bodyText = JSON.stringify(json);
    record(
      "credential secrets stripped",
      res.ok && !!credentialId && !bodyText.includes(secret),
      credentialId?.slice(0, 8)
    );
  }

  let connectionId;
  {
    const { res, json } = await req("POST", "/api/v1/connections/", {
      token: accessA,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        name: "11B Security Echo",
        connector_type: "platform.echo",
        config: { message: "secured", row_count: 2 },
        credential_id: credentialId,
        secrets: { token: "inline-secret-token" },
        auth_method: "token",
      },
    });
    const data = dataOf(json);
    connectionId = data?.id;
    const bodyText = JSON.stringify(json);
    record(
      "connection secrets stripped",
      res.ok && !!connectionId && !bodyText.includes("inline-secret-token"),
      connectionId?.slice(0, 8)
    );
  }

  {
    const { res } = await req("GET", `/api/v1/connections/${connectionId}/`, { token: tokenB });
    record("cross-org connection blocked", res.status === 403 || res.status === 404, String(res.status));
  }

  {
    const { res } = await req("GET", `/api/v1/credentials/${credentialId}/`, { token: tokenB });
    record("cross-org credential blocked", res.status === 403 || res.status === 404, String(res.status));
  }

  {
    const { res } = await req("GET", `/api/v1/connections/${connectionId}/sync-runs/`, { token: tokenB });
    record("cross-org sync-runs blocked", res.status === 403 || res.status === 404, String(res.status));
  }

  {
    const { res } = await req("GET", `/api/v1/ops/connectors/summary/?organization_id=${orgId}`);
    record("unauthenticated ops blocked", res.status === 401, String(res.status));
  }

  {
    const { res, json } = await req("GET", `/api/v1/audit/?organization_id=${orgId}&page=1`, {
      token: accessA,
    });
    const items = dataOf(json) || [];
    const actions = items.map((item) => item.action);
    record(
      "integration audit events",
      res.ok && actions.includes("credential.created") && actions.includes("connection.created"),
      actions.slice(0, 5).join(", ")
    );
  }

  const path = writePhaseReport(
    "security",
    { passed: checks.length - failed, failed, total: checks.length },
    checks
  );
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 11B.9 security certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
