import { describe, expect, it } from "vitest";

import { inLanguage } from "@/i18n/mdJa";

import { CURRENT } from "./current";
import { isGroupTable, splitRelations, splitTables } from "./relations";

// The groups of the summary, one relation a line: nothing of the cell of the .md is lost or cut in the wrong place, in English and
// in Japanese.

const groups = CURRENT[0].sections.find((section) => section.rows && isGroupTable(section.head));

describe("the main relations of a group, one a line", () => {
  it("finds the summary table of the .md", () => {
    expect(groups.rows.map((row) => row[0])).toEqual(["Users and files", "Master data", "Sale", "Accounting", "Purchase and stock"]);
  });

  it("cuts a cell at the end of each sentence, not at the dot of a name", () => {
    expect(splitRelations(groups.rows[0][2])).toEqual([
      "Attachment.uploaded_by -> User",
      "Attachment points to its owner (PurchaseOrder, QtReference or ProductionOrder) by `owner_type` + `owner_id`, with no database key",
    ]);
    expect(splitRelations(groups.rows[2][2])).toHaveLength(3);
    expect(splitRelations(groups.rows[3][2])).toEqual(["One Invoice per ProductionOrder; one Payment and one Receipt per Invoice"]);
  });

  it("loses no word: the lines give the cell again, in English and in Japanese", () => {
    for (const [, , relations] of groups.rows) {
      const lines = splitRelations(relations);
      expect(lines.join(". ").replace(/\.$/, "")).toBe(relations.replace(/\.$/, ""));
      const japanese = inLanguage(relations, "ja");
      const japaneseLines = splitRelations(japanese);
      expect(japaneseLines).toHaveLength(lines.length); // the same relations, one a line, in both languages
      expect(japaneseLines.join("。")).toBe(japanese.replace(/。$/, ""));
    }
  });

  it("gives the tables of a group one by one", () => {
    expect(splitTables(groups.rows[1][1])).toEqual(["Customer", "Product", "Material", "MaterialLot", "ProductBom", "Supplier", "SupplierMaterial"]);
    expect(groups.rows.flatMap((row) => splitTables(row[1]))).toHaveLength(23);
  });
});
