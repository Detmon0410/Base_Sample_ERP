import { execFileSync } from "node:child_process";

import { backendDir, backendEnv } from "./env.js";

// A new database: the tables (prisma migrate deploy creates the database when it is missing) and the three users.
export default async function globalSetup() {
  const env = backendEnv();
  const run = (args) => execFileSync(process.execPath, args, { cwd: backendDir, env, stdio: "inherit" });
  run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  run(["prisma/seed.js"]);
}
