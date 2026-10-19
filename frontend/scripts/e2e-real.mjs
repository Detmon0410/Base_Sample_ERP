// Runs the end-to-end specs on the real backend, one spec file at a time, each on a new database (kanou_e2e_<time>_<n>) that is dropped after it:
// the specs make records with fixed names, so two of them must not share a database. Extra arguments go to playwright (for example --grep).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const only = process.env.E2E_ONLY; // for example E2E_ONLY=acceptance.spec.js to run one file
const specs = fs.readdirSync(path.join(root, "e2e")).filter((file) => file.endsWith(".spec.js") && (!only || file === only)).sort();
const cli = path.join(root, "node_modules/@playwright/test/cli.js");
const stamp = Date.now().toString(36);
const failed = [];

specs.forEach((spec, index) => {
  console.log(`\n=== ${spec} (database kanou_e2e_${stamp}_${index})`);
  const run = spawnSync(process.execPath, [cli, "test", `e2e/${spec}`, "-c", "playwright.real.config.js", "--project=desktop", ...process.argv.slice(2)], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, E2E_DB: `kanou_e2e_${stamp}_${index}` },
  });
  if (run.status !== 0) failed.push(spec);
});

console.log(failed.length ? `\nFailed: ${failed.join(", ")}` : `\nAll ${specs.length} spec files passed on the real backend.`);
process.exit(failed.length ? 1 : 0);
