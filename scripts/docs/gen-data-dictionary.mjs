/*
 * Writes the Markdown source of the Data Dictionary from backend/prisma/schema.prisma (the truth: columns, types, keys, defaults, nullability)
 * and data-dictionary.json (the purpose of each table, the description of each column, the value lists).
 *   node gen-data-dictionary.mjs      then      node build.mjs "Data Dictionary"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const schema = fs.readFileSync(path.join(HERE, "../../backend/prisma/schema.prisma"), "utf8").replace(/\r/g, "");
const text = JSON.parse(fs.readFileSync(path.join(HERE, "data-dictionary.json"), "utf8"));
const OUT = path.join(HERE, "sources/DataDictionary/Data Dictionary.md");

const models = new Map();
for (const m of schema.matchAll(/model (\w+) \{([\s\S]*?)\n\}/g)) models.set(m[1], m[2].split("\n").map((l) => l.trim()).filter(Boolean));

const sqlType = (type, attrs) => {
  if (/@db\.Text/.test(attrs)) return "text";
  const dec = /@db\.Decimal\((\d+), (\d+)\)/.exec(attrs);
  if (dec) return `decimal(${dec[1]},${dec[2]})`;
  if (/@db\.Date/.test(attrs)) return "date";
  return { String: "varchar(191)", Int: "int", Boolean: "boolean", DateTime: "datetime(3)", Decimal: "decimal" }[type];
};

function describe(name) {
  const lines = models.get(name);
  const fk = new Map();
  const compositePk = [];
  const compositeUnique = [];
  for (const l of lines) {
    const rel = /^\w+\s+(\w+)\??\s+@relation\((?:"[^"]*",\s*)?fields: \[(\w+)\]/.exec(l);
    if (rel) fk.set(rel[2], rel[1]);
    const id = /^@@id\(\[([^\]]+)\]\)/.exec(l);
    if (id) compositePk.push(...id[1].split(",").map((s) => s.trim()));
    const uq = /^@@unique\(\[([^\]]+)\]\)/.exec(l);
    if (uq) compositeUnique.push(uq[1].split(",").map((s) => s.trim()));
  }
  const columns = [];
  for (const l of lines) {
    const f = /^(\w+)\s+(String|Int|Boolean|DateTime|Decimal)(\?)?\s*(.*)$/.exec(l);
    if (!f || l.startsWith("@@")) continue;
    const [, col, type, optional, rest] = f;
    const attrs = rest.split("//")[0];
    const keys = [];
    if (/@id/.test(attrs) || compositePk.includes(col)) keys.push("PK");
    if (fk.has(col)) keys.push("FK");
    if (/@unique/.test(attrs)) keys.push("UK");
    const def = /@default\((autoincrement\(\)|now\(\)|[^)]*)\)/.exec(attrs)?.[1];
    columns.push({
      col,
      type: sqlType(type, attrs),
      nullable: Boolean(optional),
      keys: keys.join(", "),
      def: def === "autoincrement()" ? "auto" : def === "now()" ? "now" : def === undefined ? (/@updatedAt/.test(attrs) ? "auto" : "") : def.replace(/"/g, ""),
      target: fk.get(col),
    });
  }
  return { columns, compositeUnique, compositePk };
}

const cell = (s) => String(s).replace(/\|/g, "\|");
const out = [];
out.push("# Data Dictionary", "");
out.push("Every table and column of the database of Refrigerator Factory (Version 2.0), as built. The names, types, keys and defaults are read from `backend/prisma/schema.prisma`; the descriptions say what each one is for. The relations between the tables are in the [ER Diagram](../ERDiagram/ER%20Diagram.md) and the keys and delete rules in the [DB Relations](../DBRelations/DB%20Relations.md).", "");
out.push("## How to read it", "");
out.push("| Item | Meaning |", "|---|---|");
out.push("| Table, column | The names in the database, as the Prisma model gives them (a column is written in camel case, for example `passwordHash`) |");
out.push("| Type | The MySQL type: `varchar(191)` text, `text` long text, `int` whole number, `decimal(14,3)` quantity with 3 decimals, `date`, `datetime(3)`, `boolean` |");
out.push("| Null | `yes` when the column may be empty |");
out.push("| Key | `PK` primary key, `FK` foreign key (the table it points to is in the description), `UK` unique |");
out.push("| Default | The value used when none is given: `auto` is given by the database, `now` is the current time |");
out.push("| Money | Whole yen in an `int`; no tax, no decimals |");
out.push("| Quantity | `decimal(14,3)` for materials; whole `int` for products |", "");

out.push("## Value lists", "");
out.push("These columns hold text, but only the values listed here.", "");
out.push("| Column | Values | Meaning |", "|---|---|---|");
for (const [col, values, meaning] of text.values) out.push(`| \`${col}\` | ${values} | ${meaning} |`);
out.push("");

const groups = ["Users and files", "Master data", "Sale", "Accounting", "Purchase and stock"];
const total = [...models.keys()].length;
out.push("## Tables", "", `${total} tables in 5 groups.`, "");
out.push("| Group | Tables |", "|---|---|");
for (const g of groups) out.push(`| ${g} | ${Object.entries(text.tables).filter(([, t]) => t.group === g).map(([n]) => n).join(", ")} |`);
out.push("");

for (const g of groups) {
  out.push(`## ${g}`, "");
  for (const [name, info] of Object.entries(text.tables).filter(([, t]) => t.group === g)) {
    if (!models.has(name)) throw new Error(`${name} is not in the schema`);
    const { columns, compositeUnique } = describe(name);
    out.push(`### ${name}`, "", info.purpose, "");
    out.push("| Column | Type | Null | Key | Default | Description |", "|---|---|---|---|---|---|");
    for (const c of columns) {
      let desc = info.columns[c.col] ?? text.common[c.col];
      if (!desc) throw new Error(`no description for ${name}.${c.col}`);
      if (c.target) desc += ` Points to \`${c.target}\`.`;
      out.push(`| \`${c.col}\` | ${c.type} | ${c.nullable ? "yes" : "no"} | ${c.keys} | ${cell(c.def)} | ${cell(desc)} |`);
    }
    out.push("");
    const missing = Object.keys(info.columns).filter((k) => !columns.some((c) => c.col === k));
    if (missing.length) throw new Error(`${name}: description of a column that does not exist: ${missing}`);
    for (const set of compositeUnique) out.push(`- Unique together: ${set.map((s) => `\`${s}\``).join(" + ")}.`);
    if (name === "Attachment") out.push("- No foreign key from `ownerType` + `ownerId`; the service checks the owner.");
    if (compositeUnique.length || name === "Attachment") out.push("");
  }
}
for (const name of models.keys()) if (!text.tables[name]) throw new Error(`${name} has no description`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join("\n"));
console.log("wrote", OUT, `${total} tables`);
