import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { inLanguage, JA } from "@/i18n/mdJa";

import { SECTIONS } from "./flowChart";
import { labelsOf, translateCode } from "./flowLabels";

// The flow chart page is ProjectdocInfo/Flow Chart.md: its sections, the mermaid code of each chart and the notes, word for word.
// In Japanese only the words of a chart change, never its shape.

const md = fs.readFileSync(path.resolve(import.meta.dirname, "../../../../ProjectdocInfo/Flow Chart.md"), "utf8").replace(/\r\n/g, "\n");
/** The names in a chart that are not words: a table. */
const NAMES = ["MaterialLot"];

describe("the flow charts are Flow Chart.md", () => {
  it("has its sections in its order, each chart and its notes word for word", () => {
    const source = md
      .split("\n## ")
      .slice(1)
      .map((chunk) => {
        const [title, ...rest] = chunk.split("\n");
        const body = rest.join("\n");
        const code = /```mermaid\n([\s\S]*?)\n```/.exec(body)[1];
        const notes = body
          .replace(/```mermaid\n[\s\S]*?\n```/, "")
          .split("\n\n")
          .map((paragraph) => paragraph.trim())
          .filter(Boolean);
        return { title: title.trim(), code, notes };
      });
    expect(SECTIONS).toEqual(source);
    expect(SECTIONS.map((section) => section.title)).toEqual(["Main flow", "Purchase flow", "PO status", "QT status", "Order status", "Process status", "Invoice status", "Stock changes", "Confirm QT: checks"]);
  });

  it("leaves out the intro of the .md, which only points to other documents", () => {
    const shown = JSON.stringify(SECTIONS);
    expect(shown).not.toMatch(/\]\(|\.md\b|docs\//);
  });
});

describe("the words of the charts", () => {
  const words = [...new Set(SECTIONS.flatMap((section) => [section.title, ...section.notes, ...labelsOf(section.code)]))].filter((word) => !NAMES.includes(word));

  it("has a Japanese text for every word of a chart, title and note", () => {
    for (const word of words) expect(JA[word], word).toBeTruthy();
  });

  it("writes no mark in a Japanese box that mermaid would read as code", () => {
    for (const section of SECTIONS) {
      if (section.code.trimStart().startsWith("stateDiagram")) continue;
      for (const word of labelsOf(section.code)) expect(inLanguage(word, "ja"), word).not.toMatch(/[()[\]{}"|;]/);
    }
  });

  it("changes only the words: the code is the same in both languages once the words are taken out", () => {
    for (const section of SECTIONS) {
      expect(translateCode(section.code, (word) => word)).toBe(section.code);
      const japanese = translateCode(section.code, (word) => inLanguage(word, "ja"));
      expect(labelsOf(japanese)).toHaveLength(labelsOf(section.code).length);
      expect(translateCode(japanese, () => "_")).toBe(translateCode(section.code, () => "_"));
    }
  });
});
