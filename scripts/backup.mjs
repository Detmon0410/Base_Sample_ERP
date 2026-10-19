// Backup: the database named in backend/.env (a SQL file) and the folder of the uploaded files, in backups/<database>_<time>/.
// The last 14 backups are kept. Run: node scripts/backup.mjs   (the root: pnpm run backup)
import fs from "node:fs";
import path from "node:path";

import { connectionArgs, readSettings, root, runMysql } from "./db-tools.mjs";

const KEEP = 14;
const settings = readSettings();
const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
const folder = path.join(root, "backups", `${settings.database}_${stamp}`);
fs.mkdirSync(folder, { recursive: true });

const sql = path.join(folder, "database.sql");
runMysql("mysqldump", [...connectionArgs(settings), "--single-transaction", "--routines", "--default-character-set=utf8mb4", `--result-file=${sql}`, settings.database], settings);
if (fs.existsSync(settings.uploadDir)) fs.cpSync(settings.uploadDir, path.join(folder, "uploads"), { recursive: true });
fs.writeFileSync(path.join(folder, "about.txt"), `database ${settings.database}\nmade ${new Date().toISOString()}\nuploads from ${settings.uploadDir}\n`);
console.log(`Backup made: ${folder}  (${(fs.statSync(sql).size / 1024).toFixed(1)} KB of SQL)`);

// the old ones of this database
const all = fs.readdirSync(path.join(root, "backups")).filter((name) => name.startsWith(`${settings.database}_`)).sort();
for (const old of all.slice(0, Math.max(0, all.length - KEEP))) fs.rmSync(path.join(root, "backups", old), { recursive: true, force: true });
