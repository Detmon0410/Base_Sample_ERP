// Runs backend and frontend dev servers together with plain `node` (no pnpm.exe needed).
// Used by `npm run kanou`.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const services = [
  { name: "backend", cwd: path.join(root, "backend"), pkg: "nodemon/bin/nodemon.js", args: ["src/server.js"], color: "\x1b[32m" },
  { name: "frontend", cwd: path.join(root, "frontend"), pkg: "vite/bin/vite.js", args: [], color: "\x1b[36m" },
];

const children = [];
let stopping = false;

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exit(code);
}

for (const { name, cwd, pkg, args, color } of services) {
  const entry = path.join(cwd, "node_modules", pkg);
  if (!existsSync(entry)) {
    console.error(`[${name}] cannot find ${entry}. Install the dependencies first.`);
    stopAll(1);
  }

  const child = spawn(process.execPath, [entry, ...args], { cwd, env: process.env });
  children.push(child);

  const prefix = `${color}[${name}]\x1b[0m `;
  const pipe = (stream, target) =>
    stream.on("data", (chunk) => {
      for (const line of chunk.toString().split(/\r?\n/)) if (line) target.write(prefix + line + "\n");
    });
  pipe(child.stdout, process.stdout);
  pipe(child.stderr, process.stderr);

  child.on("exit", (code) => {
    if (!stopping) {
      console.error(`${prefix}exited with code ${code}`);
      stopAll(code ?? 1);
    }
  });
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
