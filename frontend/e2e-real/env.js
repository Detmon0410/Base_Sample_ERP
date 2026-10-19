// What the end-to-end run on the real backend needs: a database of its own, named by the runner (scripts/e2e-real.mjs) in E2E_DB.
// The credentials are those of backend/.env; only the name of the database changes, and it must start with kanou_e2e_ (it is dropped after the run).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const backendDir = path.resolve(here, "../../backend");

export const BACKEND_PORT = 3310;
export const FRONTEND_PORT = 5330;

export function databaseName() {
  const name = process.env.E2E_DB;
  if (!name || !/^kanou_e2e_[A-Za-z0-9_]+$/.test(name)) throw new Error("Run this with `pnpm e2e:real` (it sets E2E_DB, the name of a new database that starts with kanou_e2e_).");
  return name;
}

/** The DATABASE_URL of backend/.env with another database name (and the same user, password and host). */
export function databaseUrl(name) {
  const text = fs.readFileSync(path.join(backendDir, ".env"), "utf8");
  const match = text.match(/^DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/m);
  if (!match) throw new Error("backend/.env has no DATABASE_URL");
  const url = new URL(match[1]);
  url.pathname = `/${name}`;
  return url.toString();
}

export function backendEnv() {
  return {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(BACKEND_PORT),
    DATABASE_URL: databaseUrl(databaseName()),
    JWT_SECRET: "e2e-only-secret",
    CORS_ORIGIN: `http://localhost:${FRONTEND_PORT}`,
    UPLOAD_DIR: path.join(process.env.TEMP ?? "/tmp", `${databaseName()}_uploads`),
  };
}
