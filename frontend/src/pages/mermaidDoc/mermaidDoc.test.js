import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { inLanguage } from "@/i18n/mdJa";
import { SECTIONS as FLOW, TITLE as FLOW_TITLE } from "@/pages/flowChart/flowChart";
import { SECTIONS as USER_FLOW, TITLE as USER_FLOW_TITLE } from "@/pages/userFlow/userFlow";

import { labelsOf, translateCode } from "./flowLabels";

// The chart pages are their .md: Flow Chart.md and User Flow.md, the same title and every section with its blocks (chart, table,
// paragraph) in order, word for word. In Japanese only the words of a chart change, never its shape.

/** A .md of charts read the same way: the title, then each "## " section with its blocks in order. */
function readMd(name) {
  const md = fs.readFileSync(path.resolve(import.meta.dirname, `../../../../ProjectdocInfo/${name}`), "utf8").replace(/\r\n/g, "\n");
  const title = md.split("\n")[0].replace(/^#\s*/, "").trim();
  const sections = md
    .split("\n## ")
    .slice(1)
    .map((chunk) => {
      const [heading, ...rest] = chunk.split("\n");
      const blocks = [];
      for (const piece of rest.join("\n").split(/(```mermaid\n[\s\S]*?\n```)/)) {
        if (piece.startsWith("```mermaid")) {
          blocks.push({ chart: piece.slice("```mermaid\n".length, -4) });
          continue;
        }
        for (const paragraph of piece.split(/\n\s*\n/)) {
          const lines = paragraph
            .trim()
            .split("\n")
            .filter((line) => line.trim());
          if (!lines.length) continue;
          if (lines[0].startsWith("|")) {
            const cells = lines.map((line) =>
              line
                .trim()
                .replace(/^\||\|$/g, "")
                .split("|")
                .map((cell) => cell.trim()),
            );
            blocks.push({ table: { head: cells[0], rows: cells.slice(2) } });
          } else blocks.push({ text: lines.map((line) => line.trim()).join(" ") });
        }
      }
      return { title: heading.trim(), blocks };
    });
  return { title, sections };
}

describe.each([
  ["Flow Chart.md", FLOW_TITLE, FLOW, 9, 9],
  ["User Flow.md", USER_FLOW_TITLE, USER_FLOW, 5, 4],
])("the page of %s", (name, title, sections, sectionCount, chartCount) => {
  const source = readMd(name);

  it("has the title of the .md and every section with its blocks, word for word", () => {
    expect(title).toBe(source.title);
    expect(sections).toEqual(source.sections);
    expect(sections).toHaveLength(sectionCount);
    expect(sections.flatMap((section) => section.blocks).filter((block) => block.chart)).toHaveLength(chartCount);
  });

  it("leaves out only the intro of the .md, which points to other documents", () => {
    expect(JSON.stringify(sections)).not.toMatch(/\]\(|\.md\b|docs\//);
  });

  it("writes no mark in a Japanese box that mermaid would read as code, and changes only the words of a chart", () => {
    for (const block of sections.flatMap((section) => section.blocks).filter((item) => item.chart)) {
      const code = block.chart;
      if (!code.trimStart().startsWith("stateDiagram")) for (const word of labelsOf(code)) expect(inLanguage(word, "ja"), word).not.toMatch(/[()[\]{}"|;]/);
      expect(translateCode(code, (word) => word)).toBe(code);
      const japanese = translateCode(code, (word) => inLanguage(word, "ja"));
      expect(translateCode(japanese, () => "_")).toBe(translateCode(code, () => "_"));
    }
  });
});

describe("the User Flow page", () => {
  it("has the table of who can do what of the .md, row for row", () => {
    const table = USER_FLOW.find((section) => section.title === "Who can do what").blocks[0].table;
    expect(table.head).toEqual(["Area", "Admin", "Sale Worker", "Factory Worker"]);
    expect(table.rows).toHaveLength(11);
    expect(table.rows.find((row) => row[0] === "Suppliers")).toEqual(["Suppliers", "yes", "no", "view only"]);
  });

  it("has the sentence under the chart of the Admin", () => {
    expect(USER_FLOW.find((section) => section.title === "Admin").blocks).toEqual([expect.objectContaining({ chart: expect.any(String) }), { text: "The Admin can do everything the two Workers can." }]);
  });
});
