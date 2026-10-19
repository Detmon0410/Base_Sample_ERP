// Restore a backup into a database. It never writes into the database of backend/.env unless --force is given, so a restore can be tried safely:
//   node scripts/restore.mjs backups/kanou_mini_erp_2026-10-19-10-00-00 --into kanou_restore_check [--uploads-to <folder>]
// The database is made if it is missing; the uploaded files are copied to --uploads-to (default: <the folder of the backup>/restored-uploads is not made).
import fs from "node:fs";
import path from "node:path";

import { connectionArgs, readSettings, root, runMysql } from "./db-tools.mjs";

const args = process.argv.slice(2);
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const folder = path.resolve(root, args.find((arg) => !arg.startsWith("--") && args.indexOf(arg) === 0) ?? "");
const target = option("--into");
const settings = readSettings();

if (!target || !fs.existsSync(path.join(folder, "database.sql"))) {
  console.error("Usage: node scripts/restore.mjs <backup folder> --into <database name> [--uploads-to <folder>] [--force]");
  process.exit(1);
}
if (target === settings.database && !args.includes("--force")) {
  console.error(`${target} is the database of backend/.env. Restore into another name first, or add --force (it replaces the data of that database).`);
  process.exit(1);
}
if (!/^[A-Za-z0-9_]+$/.test(target)) {
  console.error("The name of the database may have only letters, digits and _.");
  process.exit(1);
}

runMysql("mysql", [...connectionArgs(settings), "-e", `CREATE DATABASE IF NOT EXISTS \`${target}\` CHARACTER SET utf8mb4`], settings);
runMysql("mysql", [...connectionArgs(settings), "--default-character-set=utf8mb4", target], settings, { stdio: [fs.openSync(path.join(folder, "database.sql"), "r"), "inherit", "inherit"] });
console.log(`Restored ${path.basename(folder)} into the database ${target}.`);

const uploads = path.join(folder, "uploads");
const uploadsTo = option("--uploads-to");
if (uploadsTo && fs.existsSync(uploads)) {
  fs.cpSync(uploads, path.resolve(uploadsTo), { recursive: true });
  console.log(`Files copied to ${path.resolve(uploadsTo)}.`);
}
