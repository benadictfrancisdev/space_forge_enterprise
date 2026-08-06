/**
 * Track 8.6 — build size baseline check.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

const DIST = join(process.cwd(), "frontend", "dist", "assets");
const MAX_MAIN_GZIP_KB = 500;

function log(step, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${step}${detail ? " — " + detail : ""}`);
}

function gzipSizeKb(path) {
  const buf = gzipSync(readFileSync(path));
  return Math.round(buf.length / 1024);
}

function main() {
  let files;
  try {
    files = readdirSync(DIST).filter((f) => f.endsWith(".js"));
  } catch {
    console.error("Run npm run build first — dist/assets not found");
    process.exit(1);
  }

  const sizes = files.map((f) => {
    const full = join(DIST, f);
    return { name: f, kb: gzipSizeKb(full), raw: Math.round(statSync(full).size / 1024) };
  });

  sizes.sort((a, b) => b.kb - a.kb);
  const largest = sizes[0];
  console.log("Track 8.6 perf baseline — top chunks (gzip KB):");
  for (const s of sizes.slice(0, 5)) {
    console.log(`  ${s.kb} KB  ${s.name}`);
  }

  const ok = largest.kb <= MAX_MAIN_GZIP_KB;
  log(`largest chunk <= ${MAX_MAIN_GZIP_KB}KB gzip`, ok, `${largest.name}=${largest.kb}KB`);
  if (!ok) process.exit(1);
  console.log("\nTrack 8.6 perf validation complete.");
}

main();
