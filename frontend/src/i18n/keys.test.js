import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Every text key written out in the code as t("namespace:some.key") must exist in the English file. (A key made up at run time,
// t(`x.${code}`), cannot be read here; the Playwright tests report those: a missing translation is a console error in development.)
const root = path.resolve(import.meta.dirname, "..");
const locales = Object.fromEntries(
  fs
    .readdirSync(path.join(root, "i18n/locales/en"))
    .filter((file) => file.endsWith(".json"))
    .map((file) => [file.replace(".json", ""), JSON.parse(fs.readFileSync(path.join(root, "i18n/locales/en", file), "utf8"))]),
);

function exists(namespace, key) {
  let node = locales[namespace];
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return false;
    if (part in node) node = node[part];
    else if (`${part}_one` in node || `${part}_other` in node) node = node[`${part}_other`] ?? node[`${part}_one`];
    else return false;
  }
  return true;
}

function sources(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "mock" || entry.name === "locales" ? [] : sources(full);
    return /\.jsx?$/.test(entry.name) && !/\.test\./.test(entry.name) ? [full] : [];
  });
}

describe("text keys", () => {
  it("every t(\"namespace:key\") of the code has an English text", () => {
    const missing = [];
    for (const file of sources(root)) {
      const text = fs.readFileSync(file, "utf8");
      for (const match of text.matchAll(/\bt\(\s*"([a-z]+):([^"$]+)"/g)) {
        if (!exists(match[1], match[2])) missing.push(`${path.relative(root, file)}: ${match[1]}:${match[2]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
