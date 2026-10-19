import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("./dbRelationsPdf", () => ({ downloadDbRelationsPdf: vi.fn(async () => {}) }));

import i18n from "@/i18n";

import { CURRENT } from "./current";
import { downloadDbRelationsPdf } from "./dbRelationsPdf";
import { DbRelationsPage } from "./DbRelationsPage";

// The DB relations page: the database as it is now (the summary, then all the keys and rules in one list), in the language of
// the page, and "Download PDF" sends the same. The page and the PDF never name the documents they come from, nor their parts.

const DOCS = /\.md\b|ProjectdocInfo|docs\/|\bPart [12]\b/i;
const TABLES = CURRENT.flatMap((part) => part.sections.filter((section) => section.rows)).slice(1); // the summary is cards, not a table
const [FK, UNIQUE, COLUMN_RULES, RULES] = [0, 1, 2, 3]; // the tables of the page, in order

describe("the DB relations page", () => {
  it("shows the summary, then every key and rule of the current database", () => {
    render(<DbRelationsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "DB relations" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Current version summary (as built)", "All keys and rules (as built)"]);
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(TABLES.length);
    tables.forEach((table, index) => expect(within(table).getAllByRole("row")).toHaveLength(1 + TABLES[index].rows.length));
    // the summary: a card a group, its tables as tags and its relations one a line, the arrows shown as arrows
    const cards = screen.getAllByRole("article");
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual(["Users and files", "Master data", "Sale", "Accounting", "Purchase and stock"]);
    expect(within(cards[0]).getByText("User").className).toMatch(/font-mono/);
    expect(within(cards[0]).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "Attachment.uploaded_by → User",
      "Attachment points to its owner (PurchaseOrder, QtReference or ProductionOrder) by owner_type + owner_id, with no database key",
    ]);
    expect(within(cards[2]).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByRole("heading", { level: 3, name: "Rules to remember" }).nextElementSibling.querySelectorAll("li")).toHaveLength(5);
    // the foreign keys of the base and of Version 2.0 in one list, by table
    expect(within(tables[FK]).getAllByRole("row")[1]).toHaveTextContent("Attachmentuploaded_byUser.idmany to onenever deleted");
    expect(within(tables[FK]).getAllByText("409 IN_USE")[0].tagName).toBe("CODE");
    expect(within(tables[FK]).getByText("no database key").tagName).toBe("STRONG");
    expect(within(tables[UNIQUE]).getByText("qt_number, production_order_id")).toBeInTheDocument();
    expect(within(tables[COLUMN_RULES]).getAllByRole("row")).toHaveLength(2);
    expect(within(tables[RULES]).getAllByRole("row")[1]).toHaveTextContent(/^Confirm QT/);
    expect(screen.getByText(/\+-> Payment -> Receipt/)).toBeInTheDocument();
    expect(screen.getByText(/Purchase: Supplier -> SupplierMaterial/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("shows the words in Japanese on the Japanese page, and keeps the names, codes and chains", async () => {
    await i18n.changeLanguage("ja");
    try {
      render(<DbRelationsPage />);
      expect(screen.getByRole("heading", { level: 1, name: "DBリレーション" })).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["現在のバージョンの概要（実装済み）", "すべてのキーとルール（実装済み）"]);
      const tables = screen.getAllByRole("table");
      const cards = screen.getAllByRole("article");
      expect(cards[0].getAttribute("aria-label")).toBe("ユーザーとファイル");
      expect(within(cards[0]).getByText("主なリレーション")).toBeInTheDocument();
      expect(within(cards[0]).getAllByRole("listitem")[0]).toHaveTextContent("Attachment.uploaded_by → User");
      expect(within(tables[FK]).getAllByRole("columnheader").map((head) => head.textContent)).toEqual(["テーブル", "列", "参照先", "多重度", "削除ルール"]);
      expect(within(tables[FK]).getAllByRole("row")[2]).toHaveTextContent("Attachment(owner_type, owner_id)PurchaseOrder・QtReference・ProductionOrder のいずれか多対一（データベースのキーなし）");
      expect(screen.getByRole("heading", { level: 3, name: "列のルール" })).toBeInTheDocument();
      expect(within(tables[RULES]).getAllByRole("row")[1]).toHaveTextContent(/^QTの確定/);
      expect(screen.getByText(/\+-> Payment -> Receipt/)).toBeInTheDocument();
      expect(document.body.textContent).not.toMatch(DOCS);
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("downloads the PDF in the language of the page, with what the page shows", async () => {
    const user = userEvent.setup();
    downloadDbRelationsPdf.mockClear();
    const { unmount } = render(<DbRelationsPage />);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadDbRelationsPdf).toHaveBeenCalledTimes(1));
    const english = downloadDbRelationsPdf.mock.calls[0][0];
    expect(english.language).toBe("en");
    expect(english.paper).toBe("a4");
    expect(english.fileName).toMatch(/^db-relations-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(english.texts).toEqual({ system: "Refrigerator Factory Mini ERP", title: "DB relations", subtitle: "Keys, relations and delete rules, and the rules that touch several tables", footer: expect.stringMatching(/^Made on \d{4}-\d{2}-\d{2}$/) });
    expect(english.parts.map((part) => part.title)).toEqual(CURRENT.map((part) => part.title));
    expect(english.parts[1].sections[0].rows).toEqual(CURRENT[1].sections[0].rows);
    expect(english.parts[1].sections[0].mono).toEqual([0, 1]); // Table and Column hold names
    expect(english.parts[0].sections[1]).toEqual({ title: "Rules to remember", items: CURRENT[0].sections[1].items });
    unmount();

    await i18n.changeLanguage("ja");
    try {
      downloadDbRelationsPdf.mockClear();
      render(<DbRelationsPage />);
      await user.click(screen.getByRole("button", { name: "PDFをダウンロード" }));
      await waitFor(() => expect(downloadDbRelationsPdf).toHaveBeenCalledTimes(1));
      const japanese = downloadDbRelationsPdf.mock.calls[0][0];
      expect(japanese.language).toBe("ja");
      expect(japanese.texts.title).toBe("DBリレーション");
      expect(japanese.parts[1].title).toBe("すべてのキーとルール（実装済み）");
      const words = japanese.parts.flatMap((part) => [part.title, part.intro, ...part.sections.flatMap((section) => [section.title, ...(section.items ?? []), ...(section.rows ?? []).flat()])]);
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
