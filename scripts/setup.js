import { existsSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

function ensureEnv(dir) {
  const envPath = join(root, dir, ".env");
  const examplePath = join(root, dir, ".env.example");

  if (!existsSync(envPath) && existsSync(examplePath)) {
    copyFileSync(examplePath, envPath);
    console.log(`Created ${dir}/.env from .env.example`);
  }
}

function run(command) {
  console.log(`\n> ${command}`);
  execSync(command, { cwd: root, stdio: "inherit" });
}

ensureEnv("backend");
ensureEnv("frontend");

run("pnpm install");
run("pnpm --filter ./backend run prisma:generate");

console.log("\nSetup complete.");
console.log("- Fill in backend/.env with your real DATABASE_URL, then run: pnpm run db:migrate");
console.log("- Start both apps with: pnpm run kanou");
