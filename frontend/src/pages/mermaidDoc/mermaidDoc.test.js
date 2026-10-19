import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { inLanguage } from "@/i18n/mdJa";
import { INTRO as APIS_INTRO, SECTIONS as APIS, TITLE as APIS_TITLE } from "@/pages/apisDiagram/apisDiagram";
import { SECTIONS as FLOW, TITLE as FLOW_TITLE } from "@/pages/flowChart/flowChart";
import { SECTIONS as USER_FLOW, TITLE as USER_FLOW_TITLE } from "@/pages/userFlow/userFlow";

import { censor } from "@/utils/censor";

import { forChart, labelsOf, translateCode } from "./flowLabels";

// The chart pages are their .md: Flow Chart.md, User Flow.md and APIs Diagram.md, the same title and every section with its blocks
// (chart, sub-heading, table, paragraph) in order, word for word. In Japanese only the words of a chart change, never its shape.

/** The blocks of a part of a .md: mermaid charts, "### " sub-headings, tables (with the alignment of their columns) and paragraphs. */
function blocksOf(text) {
  const blocks = [];
  for (const piece of text.split(/(```mermaid\n[\s\S]*?\n```)/)) {
    if (piece.startsWith("```mermaid")) {
      blocks.push({ chart: piece.slice("```mermaid\n".length, -4) });
      continue;
    }
    for (const paragraph of piece.split(/\n\s*\n/)) {
      let lines = paragraph
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      if (lines[0]?.startsWith("### ")) {
        blocks.push({ heading: lines[0].slice(4).trim() });
        lines = lines.slice(1);
      }
      if (!lines.length) continue;
      if (lines[0].startsWith("|")) {
        const cells = lines.map((line) =>
          line
            .trim()
            .replace(/^\||\|$/g, "")
            .split("|")
            .map((cell) => cell.trim()),
        );
        const table = { head: cells[0], rows: cells.slice(2) };
        if (cells[1].some((cell) => cell.includes(":"))) table.align = cells[1].map((cell) => (cell.startsWith(":") && cell.endsWith(":") ? "center" : cell.endsWith(":") ? "right" : "left"));
        blocks.push({ table });
      } else blocks.push({ text: lines.map((line) => line.trim()).join(" ") });
    }
  }
  return blocks;
}

/**
 * A .md of charts read the same way: the title, the intro (the paragraphs before the first "## ", without the sentences that point
 * to other documents) and each "## " section with its blocks in order.
 */
function readMd(name) {
  const md = fs.readFileSync(path.resolve(import.meta.dirname, `../../../../ProjectdocInfo/${name}`), "utf8").replace(/\r\n/g, "\n");
  const title = md.split("\n")[0].replace(/^#\s*/, "").trim();
  const [head, ...chunks] = md.split("\n## ");
  const intro = blocksOf(head.split("\n").slice(1).join("\n"))
    .map((block) =>
      block.text
        .split(/(?<=\.)\s+(?=[A-Z])/)
        .filter((sentence) => !sentence.includes("]("))
        .join(" "),
    )
    .filter(Boolean)
    .map((text) => ({ text }));
  const sections = chunks.map((chunk) => {
    const [heading, ...rest] = chunk.split("\n");
    return { title: heading.trim(), blocks: blocksOf(rest.join("\n")) };
  });
  return { title, intro, sections };
}

describe.each([
  ["Flow Chart.md", FLOW_TITLE, [], FLOW, 9, 9],
  ["User Flow.md", USER_FLOW_TITLE, [], USER_FLOW, 5, 4],
  ["APIs Diagram.md", APIS_TITLE, APIS_INTRO, APIS, 9, 6],
])("the page of %s", (name, title, intro, sections, sectionCount, chartCount) => {
  const source = readMd(name);

  it("has the title of the .md, its intro and every section with its blocks, word for word", () => {
    expect(title).toBe(source.title);
    // the intro of Flow Chart.md and User Flow.md only points to other documents: it is left out
    if (intro.length) expect(intro).toEqual(source.intro);
    expect(sections).toEqual(source.sections);
    expect(sections).toHaveLength(sectionCount);
    expect(sections.flatMap((section) => section.blocks).filter((block) => block.chart)).toHaveLength(chartCount);
  });

  it("leaves out only what points to other documents", () => {
    expect(JSON.stringify([intro, sections])).not.toMatch(/\]\(|\.md\b|docs\//);
  });

  it("writes no mark in a Japanese label that mermaid would read as code, and changes only the words of a chart", () => {
    for (const block of sections.flatMap((section) => section.blocks).filter((item) => item.chart)) {
      const code = block.chart;
      // a mark is in the Japanese only where the English has it
      for (const word of labelsOf(code)) for (const mark of '()[]{}"|;#') if (inLanguage(word, "ja").includes(mark)) expect(word, `${mark} in the Japanese of ${word}`).toContain(mark);
      expect(translateCode(code, (word) => word)).toBe(code);
      // the same shape (an ER label in Japanese only gets quotes: mermaid reads a bare label as letters only)
      const shape = (chart) => translateCode(chart, () => "_").replaceAll('"_"', "_");
      expect(shape(translateCode(code, (word) => inLanguage(word, "ja")))).toBe(shape(code));
    }
  });

  it("has charts that mermaid reads, in English and in Japanese, with what is hidden", async () => {
    const { default: mermaid } = await import("mermaid");
    for (const language of ["en", "ja"]) {
      for (const block of sections.flatMap((section) => section.blocks).filter((item) => item.chart)) {
        await expect(mermaid.parse(translateCode(block.chart, (word) => forChart(censor(inLanguage(word, language))))), `${language}: ${block.chart.slice(0, 40)}`).resolves.toBeTruthy();
      }
    }
  }, 60000);
});

describe("the words of a chart", () => {
  it("are found in every kind of chart, and only the words", () => {
    expect(labelsOf('flowchart LR\n    FE[Frontend] -->|JSON| R["/api"]\n    S -. ApiError .-> ERR[(Prisma)]')).toEqual(["Frontend", "JSON", "/api", "ApiError", "Prisma"]);
    expect(labelsOf('stateDiagram-v2\n    [*] --> A\n    state "Order Draft" as A\n    A --> B: first moves')).toEqual(["Order Draft", "first moves"]);
    expect(labelsOf("sequenceDiagram\n    actor Sale as Sale Worker / Admin\n    participant API\n    Sale->>API: POST /qt\n    API-->>Sale: answer\n    Note over API: computed")).toEqual(["Sale Worker / Admin", "POST /qt", "answer", "computed"]);
    expect(labelsOf('erDiagram\n    User ||--o{ ProgressEntry : writes\n    OrderLine ||--|{ OrderProcess : "made by"')).toEqual(["writes", "made by"]);
  });
});

describe("the APIs Diagram page", () => {
  it("has the intro without the sentence that points to the contract, the sub-heading of the purchase flow and the aligned tables", () => {
    expect(APIS_INTRO[0].text).toMatch(/^Summary of the backend API built in `backend\/` \(Node\.js, Express, Prisma, MySQL\)\. Base URL /);
    expect(APIS[3].blocks.map((block) => Object.keys(block)[0])).toEqual(["chart", "heading", "chart"]);
    expect(APIS[3].blocks[1]).toEqual({ heading: "Purchase flow" });
    expect(APIS[2].blocks[0].table.align).toEqual(["left", "center", "center", "center"]);
    expect(APIS[6].blocks[0].table.align).toEqual(["right", "left", "left"]);
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
