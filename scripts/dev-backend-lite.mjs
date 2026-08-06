/**
 * Start backend in "lite" mode (no Docker).
 * FRONTEND stays separate — this only serves Django on :8000.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = path.join(root, "backend");
const isWin = process.platform === "win32";
const venvPython = path.join(
  backend,
  ".venv",
  isWin ? "Scripts" : "bin",
  isWin ? "python.exe" : "python",
);

if (!fs.existsSync(venvPython)) {
  console.error("Missing backend/.venv — create it first:");
  console.error("  cd backend && python -m venv .venv && .venv\\Scripts\\pip install -r requirements.txt");
  process.exit(1);
}

const env = {
  ...process.env,
  DJANGO_SETTINGS_MODULE: "config.settings.lite",
  AUTH_MODE: process.env.AUTH_MODE || "dev",
  DJANGO_DEBUG: "true",
  DJANGO_ALLOWED_HOSTS: "localhost,127.0.0.1",
  DJANGO_CORS_ALLOWED_ORIGINS:
    "http://localhost:8080,http://localhost:5173,http://localhost:3000",
};

function run(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(venvPython, args, {
      cwd: backend,
      env,
      stdio: "inherit",
      shell: false,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${args.join(" ")} exited ${code}`));
    });
  });
}

console.log("═══════════════════════════════════════");
console.log("  BACKEND (lite) — Django on :8000");
console.log("  Not the frontend (that is :5173)");
console.log("═══════════════════════════════════════");

await run(["manage.py", "migrate", "--noinput"]);
await run(["manage.py", "seed_platform"]).catch(() => {
  console.warn("seed_platform skipped or already applied");
});

const server = spawn(venvPython, ["manage.py", "runserver", "8000"], {
  cwd: backend,
  env,
  stdio: "inherit",
  shell: false,
});

server.on("exit", (code) => process.exit(code ?? 0));
