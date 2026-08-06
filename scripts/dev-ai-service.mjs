/**
 * Start FastAPI AI compute on :8100
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
  isWin ? "python.exe" : "python"
);

if (!fs.existsSync(venvPython)) {
  console.error("Missing backend/.venv");
  process.exit(1);
}

console.log("═══════════════════════════════════════");
console.log("  AI COMPUTE (FastAPI) — :8100");
console.log("  Django should use AI_SERVICE_MODE=http");
console.log("═══════════════════════════════════════");

const child = spawn(
  venvPython,
  ["-m", "uvicorn", "ai_service.main:app", "--host", "0.0.0.0", "--port", "8100", "--reload"],
  {
    cwd: backend,
    env: { ...process.env, PYTHONPATH: backend },
    stdio: "inherit",
    shell: false,
  }
);

child.on("exit", (code) => process.exit(code ?? 0));
