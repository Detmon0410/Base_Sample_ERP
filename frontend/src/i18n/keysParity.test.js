import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The Japanese files must have the same keys as the English ones, a text for every key, and the same {{placeholders}}.
const dir = path.resolve(import.meta.dirname, "locales");
const flat = (object, prefix = "") =>
  Object.entries(object).flatMap(([key, value]) => (value && typeof value === "object" ? flat(value, `${prefix}${key}.`) : [[`${prefix}${key}`, value]]));
const placeholders = (text) => [...String(text).matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort();

describe("Japanese texts", () => {
  for (const file of fs.readdirSync(path.join(dir, "en")).filter((name) => name.endsWith(".json"))) {
    it(`${file} has every English key, filled, with the same placeholders`, () => {
      const en = Object.fromEntries(flat(JSON.parse(fs.readFileSync(path.join(dir, "en", file), "utf8"))));
      const ja = Object.fromEntries(flat(JSON.parse(fs.readFileSync(path.join(dir, "ja", file), "utf8"))));
      const problems = [];
      for (const [key, text] of Object.entries(en)) {
        if (!(key in ja)) problems.push(`missing: ${key}`);
        else if (String(ja[key]).trim() === "" && String(text).trim() !== "") problems.push(`empty: ${key}`);
        else if (placeholders(text).join() !== placeholders(ja[key]).join()) problems.push(`placeholders differ: ${key}`);
      }
      for (const key of Object.keys(ja)) if (!(key in en)) problems.push(`extra: ${key}`);
      expect(problems).toEqual([]);
    });
  }
});
