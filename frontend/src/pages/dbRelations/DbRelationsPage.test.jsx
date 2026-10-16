import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("./dbRelationsPdf", () => ({ downloadDbRelationsPdf: vi.fn(async () => {}) }));

import i18n from "@/i18n";

import { PARTS } from "./dbRelations";
import { downloadDbRelationsPdf } from "./dbRelationsPdf";
import { DbRelationsPage } from "./DbRelationsPage";

// The DB relations page: both parts with all their tables and chains, in the language of the page, and "Download PDF" sends the same
// parts. The page and the PDF never name the documents they come from.

const DOCS = /\.md\b|ProjectdocInfo|docs\//i;
const TABLES = PARTS.flatMap((part) => part.sections.filter((section) => section.rows));

describe("the DB relations page", () => {
  it("shows both parts, every table with its rows and both chains", () => {
    render(<DbRelationsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "DB relations" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(PARTS.map((part) => part.title));
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(TABLES.length);
    tables.forEach((table, index) => expect(within(table).getAllByRole("row")).toHaveLength(1 + TABLES[index].rows.length));
    // the delete rule of a foreign key, its code shown as code; the bold of the .md shown bold
    expect(within(tables[0]).getAllByRole("row")[1]).toHaveTextContent("QtReferencecustomer_idCustomer.idmany to onecustomer in use -> 409 IN_USE");
    expect(within(tables[0]).getAllByText("409 IN_USE")[0].tagName).toBe("CODE");
    expect(within(tables[3]).getByText("no database key").tagName).toBe("STRONG");
    expect(screen.getByText(/\+-> Payment -> Receipt/)).toBeInTheDocument();
    expect(screen.getByText(/Purchase: Supplier -> SupplierMaterial/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("shows the words in Japanese on the Japanese page, and keeps the names, codes and chains", async () => {
    await i18n.changeLanguage("ja");
    try {
      render(<DbRelationsPage />);
      expect(screen.getByRole("heading", { level: 1, name: "DBリレーション" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 2 })[1]).toHaveTextContent("パート2：バージョン2.0で追加・変更されたもの（実装済み）");
      const tables = screen.getAllByRole("table");
      expect(within(tables[0]).getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["テーブル", "列", "参照先", "多重度", "削除ルール"]);
      expect(within(tables[0]).getAllByRole("row")[1]).toHaveTextContent("QtReferencecustomer_idCustomer.id多対一顧客が使用中なら 409 IN_USE");
      expect(within(tables[3]).getAllByRole("row").at(-1)).toHaveTextContent("Attachment(owner_type, owner_id)PurchaseOrder・QtReference・ProductionOrder のいずれか多対一（データベースのキーなし）");
      expect(screen.getByText(/\+-> Payment -> Receipt/)).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(DOCS);
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("downloads the PDF in the language of the page, with the parts of the page", async () => {
    const user = userEvent.setup();
    downloadDbRelationsPdf.mockClear();
    const { unmount } = render(<DbRelationsPage />);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadDbRelationsPdf).toHaveBeenCalledTimes(1));
    const english = downloadDbRelationsPdf.mock.calls[0][0];
    expect(english.language).toBe("en");
    expect(english.fileName).toMatch(/^db-relations-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(english.paper).toBe("a4");
    expect(english.texts).toEqual({ system: "Refrigerator Factory Mini ERP", title: "DB relations", subtitle: "Keys, relations and delete rules, and the rules that touch several tables", footer: expect.stringMatching(/^Made on \d{4}-\d{2}-\d{2}$/) });
    expect(english.parts[0].sections[0].mono).toEqual([0, 1]); // Table and Column hold names
    expect(english.parts.map((part) => part.title)).toEqual(PARTS.map((part) => part.title));
    expect(english.parts[0].sections[0].rows[0]).toEqual(PARTS[0].sections[0].rows[0]);
    expect(english.parts[0].sections[3].chain).toBe(PARTS[0].sections[3].chain);
    unmount();

    await i18n.changeLanguage("ja");
    try {
      downloadDbRelationsPdf.mockClear();
      render(<DbRelationsPage />);
      await user.click(screen.getByRole("button", { name: "PDFをダウンロード" }));
      await waitFor(() => expect(downloadDbRelationsPdf).toHaveBeenCalledTimes(1));
      const japanese = downloadDbRelationsPdf.mock.calls[0][0];
      expect(japanese.language).toBe("ja");
      expect(japanese.texts.system).toBe("冷蔵庫工場 Mini ERP");
      expect(japanese.texts.title).toBe("DBリレーション");
      expect(japanese.parts[0].title).toBe("パート1：基本のテーブル（バージョン2.0より前の Mini ERP）");
      expect(japanese.parts[0].sections[0].rows[0]).toEqual(["QtReference", "customer_id", "Customer.id", "多対一", "顧客が使用中なら `409 IN_USE`"]);
      const words = japanese.parts.flatMap((part) => [part.title, part.intro, ...part.sections.flatMap((section) => [section.title, ...(section.rows ?? []).flat()])]);
      for (const text of [...Object.values(japanese.texts), ...words]) expect(text).not.toMatch(DOCS);
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("makes the PDF on the paper chosen beside the button", async () => {
    const user = userEvent.setup();
    downloadDbRelationsPdf.mockClear();
    render(<DbRelationsPage />);
    await user.selectOptions(screen.getByLabelText("Paper size"), "a3");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadDbRelationsPdf).toHaveBeenCalledTimes(1));
    expect(downloadDbRelationsPdf.mock.calls[0][0].paper).toBe("a3");
  });
});
