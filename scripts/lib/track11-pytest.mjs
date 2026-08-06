/**
 * Track 11 — shared pytest runner for integration platform certification.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

export const TRACK11_TEST_FILES = [
  "tests/test_integrations_framework.py",
  "tests/test_credentials.py",
  "tests/test_connections.py",
  "tests/test_discovery.py",
  "tests/test_sync.py",
  "tests/test_transforms.py",
  "tests/test_csv_excel_connectors.py",
  "tests/test_rest_api_connector.py",
  "tests/test_postgresql_connector.py",
  "tests/test_sql_connectors.py",
  "tests/test_mongodb_connector.py",
  "tests/test_cloud_storage_connectors.py",
  "tests/test_saas_connectors.py",
  "tests/test_track11b_ops.py",
  "tests/test_track11b_exit.py",
];

export function resolveBackendPython() {
  const candidates = [
    join(process.cwd(), "backend", ".venv", "Scripts", "python.exe"),
    join(process.cwd(), "backend", ".venv", "bin", "python"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return "python";
}

export function runTrack11Pytest({ quiet = true, extraArgs = [] } = {}) {
  const python = resolveBackendPython();
  const backendDir = join(process.cwd(), "backend");
  const args = ["-m", "pytest", ...TRACK11_TEST_FILES];
  if (quiet) args.push("-q");
  args.push(...extraArgs);

  const output = execSync(`"${python}" ${args.map((a) => JSON.stringify(a)).join(" ")}`, {
    cwd: backendDir,
    encoding: "utf8",
    env: {
      ...process.env,
      DJANGO_SETTINGS_MODULE: "config.settings.test",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  const passedMatch = output.match(/(\d+) passed/);
  const failedMatch = output.match(/(\d+) failed/);
  return {
    output: output.trim(),
    passed: passedMatch ? parseInt(passedMatch[1], 10) : 0,
    failed: failedMatch ? parseInt(failedMatch[1], 10) : 0,
    tail: output.trim().split("\n").pop() || "",
  };
}
