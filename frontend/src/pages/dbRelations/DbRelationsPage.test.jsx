import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("./dbRelationsPdf", () => ({ downloadDbRelationsPdf: vi.fn(async () => {}) }));

import i18n from "@/i18n";

import { PARTS } from "./dbRelations";
import { downloadDbRelationsPdf } from "./dbRelationsPdf";
import { DbRelationsPage } from "./DbRelationsPage";

// The DB Relations page is DB Relations.md: its title, the summary (its groups as cards), Part 1 and Part 2, each with its intro,
// tables and chain, in the order of the .md; in the language of the page; "Download PDF" sends the same. It never names the
// documents it comes from.

const DOCS = /\.md\b|ProjectdocInfo|docs\//i;
const TABLES = PARTS.flatMap((part) => part.sections.filter((section) => section.rows)).slice(1); // the summary is cards, not a table
const [FK, , , NEW_FK, CHANGED, , RULES_2] = [0, 1, 2, 3, 4, 5, 6]; // the tables of the page, in order

describe("the DB Relations page", () => {
  it("has the title of the .md, the summary, Part 1 and Part 2, every table with its rows and both chains", () => {
    render(<DbRelationsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "DB Relations" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(PARTS.map((part) => part.title));
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(PARTS.flatMap((part) => part.sections.map((section) => section.title).filter(Boolean)));
    expect(screen.getByText("The whole model, as built, is in the ER Diagram.", { exact: false })).toBeInTheDocument();
    const cards = screen.getAllByRole("article");
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual(["Users and files", "Master data", "Sale", "Accounting", "Purchase and stock"]);
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(TABLES.length);
    tables.forEach((table, index) => expect(within(table).getAllByRole("row")).toHaveLength(1 + TABLES[index].rows.length));
    expect(within(tables[FK]).getAllByRole("row")[1]).toHaveTextContent("QtReferencecustomer_idCustomer.idmany to onecustomer in use → 409 IN_USE");
    expect(within(tables[NEW_FK]).getByText("no database key").tagName).toBe("STRONG");
    expect(within(tables[CHANGED]).getAllByRole("row")).toHaveLength(1 + 3);
    expect(within(tables[RULES_2]).getAllByRole("row").at(-1)).toHaveTextContent("Start productionas beforeUnchanged");
    expect(screen.getByText(/\+-> Payment -> Receipt/)).toBeInTheDocument();
    expect(screen.getByText(/Purchase: Supplier -> SupplierMaterial/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("shows the words in Japanese on the Japanese page, and keeps the names, codes and chains", async () => {
    await i18n.changeLanguage("ja");
    try {
      render(<DbRelationsPage />);
      expect(screen.getByRole("heading", { level: 1, name: "DBリレーション" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 2 })[1]).toHaveTextContent("パート1：基本のテーブル（バージョン2.0より前の Mini ERP）");
      const tables = screen.getAllByRole("table");
      expect(within(tables[FK]).getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["テーブル", "列", "参照先", "多重度", "削除ルール"]);
      expect(within(tables[RULES_2]).getAllByRole("row").at(-1)).toHaveTextContent("製造開始従来どおり変更なし");
      expect(screen.getByText(/実装済みのモデル全体はER図にあります/)).toBeInTheDocument();
      expect(screen.getByText(/\+-> Payment -> Receipt/)).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(DOCS);
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("downloads the PDF in the language of the page, with what the page shows, on the paper chosen", async () => {
    const user = userEvent.setup();
    downloadDbRelationsPdf.mockClear();
    render(<DbRelationsPage />);
    await user.selectOptions(screen.getByLabelText("Paper size"), "a3");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadDbRelationsPdf).toHaveBeenCalledTimes(1));
    const [{ language, paper, parts, texts, fileName }] = downloadDbRelationsPdf.mock.calls[0];
    expect([language, paper]).toEqual(["en", "a3"]);
    expect(fileName).toMatch(/^db-relations-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(texts).toEqual({ system: "Refrigerator Factory Mini ERP", title: "DB Relations", footer: expect.stringMatching(/^Made on /) });
    expect(parts.map((part) => part.title)).toEqual(PARTS.map((part) => part.title));
    expect(parts[1].sections[0].rows).toEqual(PARTS[1].sections[0].rows);
    expect(parts[0].sections[1]).toEqual({ title: "Rules to remember", items: PARTS[0].sections[1].items });
    expect(parts[2].sections.map((section) => section.title)).toEqual(PARTS[2].sections.map((section) => section.title));
  });
});
