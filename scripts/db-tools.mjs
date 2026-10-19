// What backup.mjs and restore.mjs share: the settings of backend/.env and the MySQL programs.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const backendDir = path.join(root, "backend");

/** The settings of backend/.env: { databaseUrl, host, port, user, password, database, uploadDir (an absolute path) }. */
export function readSettings() {
  const text = fs.readFileSync(path.join(backendDir, ".env"), "utf8");
  const pick = (key) => text.match(new RegExp(`^${key}\s*=\s*"?([^"\r\n]*)"?`, "m"))?.[1];
  const databaseUrl = pick("DATABASE_URL");
  if (!databaseUrl) throw new Error("backend/.env has no DATABASE_URL");
  const url = new URL(databaseUrl);
  return {
    databaseUrl,
    host: url.hostname,
    port: url.port || "3306",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    uploadDir: path.resolve(backendDir, pick("UPLOAD_DIR") || "uploads"),
  };
}

/** Finds a MySQL program (mysqldump or mysql): the variable MYSQL_BIN (a folder), the PATH, then the usual folder of Windows. */
export function mysqlProgram(name) {
  const exe = process.platform === "win32" ? `${name}.exe` : name;
  const candidates = [];
  if (process.env.MYSQL_BIN) candidates.push(path.join(process.env.MYSQL_BIN, exe));
  for (const folder of (process.env.PATH ?? "").split(path.delimiter)) candidates.push(path.join(folder, exe));
  if (process.platform === "win32") {
    const base = "C:/Program Files/MySQL";
    let versions = ["MySQL Server 8.0", "MySQL Server 8.4", "MySQL Server 9.0"];
    try {
      versions = [...fs.readdirSync(base), ...versions];
    } catch {
      // the folder cannot be listed: the usual names are tried
    }
    for (const version of versions) candidates.push(path.join(base, version, "bin", exe));
  }
  const found = candidates.find((file) => file && fs.existsSync(file));
  if (!found) throw new Error(`${exe} was not found. Put the folder of the MySQL programs in the variable MYSQL_BIN.`);
  return found;
}

/** Runs a MySQL program with the password in the environment (not on the command line). */
export function runMysql(name, args, settings, options = {}) {
  const run = spawnSync(mysqlProgram(name), args, { env: { ...process.env, MYSQL_PWD: settings.password }, stdio: options.stdio ?? "inherit", encoding: "utf8", ...options.spawn });
  if (run.status !== 0) throw new Error(`${name} failed (${run.status}): ${run.stderr ?? ""}`);
  return run;
}

export const connectionArgs = (settings) => [`--host=${settings.host}`, `--port=${settings.port}`, `--user=${settings.user}`];
