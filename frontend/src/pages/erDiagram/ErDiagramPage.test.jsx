import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("./erPdf", async (importOriginal) => ({ ...(await importOriginal()), downloadErDiagramPdf: vi.fn(async () => {}) }));

import i18n from "@/i18n";

import { buildDiagram } from "./erLayout";
import { ENTITIES, RELATIONSHIPS } from "./erModel";
import { downloadErDiagramPdf } from "./erPdf";
import { ErDiagramPage } from "./ErDiagramPage";

// The ER diagram page: the drawing has every table, the table under it every relationship, and "Download PDF" sends the same
// drawing and words as the page, in its language. The page and the PDF never name the documents they come from.

const DOCS = /\.md\b|ProjectdocInfo|DB Relations|docs\//i; // not ER diagram: that is the name of the page

describe("the ER diagram page", () => {
  it("draws every table and lists every relationship", () => {
    render(<ErDiagramPage />);
    const drawing = screen.getByRole("img", { name: `ER diagram: ${ENTITIES.length} tables and ${RELATIONSHIPS.length} relationships` });
    for (const entity of ENTITIES) expect(within(drawing).getByText(entity.name)).toBeInTheDocument();
    const [relationships, rules] = screen.getAllByRole("table");
    expect(screen.getAllByRole("table")).toHaveLength(2);
    const rows = within(relationships).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(RELATIONSHIPS.length);
    // the delete rule of DB Relations.md beside each relationship, its code marks shown as code
    expect(within(rows[0]).getByText("409 IN_USE").tagName).toBe("CODE");
    expect(within(rows[3]).getByText("goes with the order")).toBeInTheDocument();
    expect(screen.getByText(/^Unique keys with a detail/)).toHaveTextContent("User.email (lower-cased); ProductionOrder.order_number (ORD-yyyy-0001, given by the server)");
    expect(within(rules).getAllByRole("row")).toHaveLength(1 + 5);
    expect(screen.queryByText(/Payment -> Receipt/)).toBeNull(); // the chain of one sale is not repeated: the drawing shows it
    expect(document.body.textContent).not.toMatch(DOCS);
    // as in ER Diagram.md: PRODUCTION_ORDER ||--|{ ORDER_LINE : "contains", PRODUCTION_ORDER o|--o{ STOCK_CHANGE : "start deducts"
    expect(within(rows[3]).getByText("exactly one : one or many")).toBeInTheDocument();
    expect(within(rows[13]).getByText("zero or one : zero or many")).toBeInTheDocument();
    expect(within(rows[13]).getByText("start deducts")).toBeInTheDocument();
  });

  it("shows the words of the .md files in Japanese on the Japanese page, and keeps the names, values and codes", async () => {
    await i18n.changeLanguage("ja");
    try {
      render(<ErDiagramPage />);
      const drawing = screen.getByRole("img", { name: `ER図：テーブル${ENTITIES.length}個、リレーション${RELATIONSHIPS.length}個` });
      expect(within(drawing).getByText("開始時に引き落とす")).toBeInTheDocument(); // the label "start deducts"
      expect(within(drawing).getAllByText("スナップショット").length).toBeGreaterThan(0); // the note "snapshot"
      expect(within(drawing).getByText("表記（クロウズフット）")).toBeInTheDocument();
      expect(within(drawing).getByText("PRODUCTION_ORDER")).toBeInTheDocument();
      expect(within(drawing).getByText("Admin | Worker")).toBeInTheDocument();
      expect(within(drawing).queryByText("start deducts")).toBeNull();

      const [relationships, rules] = screen.getAllByRole("table");
      const row = within(relationships).getAllByRole("row")[1];
      expect(within(row).getByText("CUSTOMER")).toBeInTheDocument();
      expect(within(row).getByText("持つ")).toBeInTheDocument();
      expect(within(row).getByText(/顧客が使用中なら/)).toBeInTheDocument();
      expect(within(row).getByText("409 IN_USE").tagName).toBe("CODE");
      expect(within(rules).getAllByRole("row")[1]).toHaveTextContent("製造開始（POST /orders/:id/start）");
      expect(within(rules).getByText("POST /orders/:id/start").tagName).toBe("CODE");
      expect(within(rules).getByText("ProductionOrder.started_at, MaterialLot, StockChange")).toBeInTheDocument();
      expect(screen.getByText(/^補足のある一意キー/)).toHaveTextContent("User.email（小文字で比較）");
      expect(document.body.textContent).not.toMatch(DOCS);
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("downloads the PDF of the English page in English: the drawing of the page, plain ASCII for the font of the PDF", async () => {
    const user = userEvent.setup();
    downloadErDiagramPdf.mockClear();
    render(<ErDiagramPage />);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadErDiagramPdf).toHaveBeenCalledTimes(1));
    const [{ language, diagram, texts, relationshipRows, uniqueDetails, ruleRows, fileName }] = downloadErDiagramPdf.mock.calls[0];
    expect(language).toBe("en");
    expect(diagram).toEqual(buildDiagram("en"));
    expect(fileName).toMatch(/^er-diagram-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(texts.title).toBe("Refrigerator Factory Mini ERP - ER diagram");
    expect(texts.columns).toEqual(["Parent", "Child", "Foreign key", "Parent : child", "Meaning", "Delete rule"]);
    expect(texts.rulesColumns).toEqual(["Event", "Tables written", "Rule"]);
    expect(texts.notes).toHaveLength(4);
    expect(relationshipRows).toHaveLength(RELATIONSHIPS.length);
    expect(relationshipRows[0]).toEqual(["CUSTOMER", "QT_REFERENCE", "customer_id", "1 : 0..N", "has", "customer in use -> `409 IN_USE`"]);
    expect(ruleRows).toHaveLength(5);
    // the built-in font of a PDF has no Japanese: every English text sent must be plain ASCII
    const all = [...Object.values(texts).flat(), ...relationshipRows.flat(), ...uniqueDetails, ...ruleRows.flat()];
    for (const text of all) expect(text).toMatch(/^[\x20-\x7e]*$/);
    for (const text of all) expect(text).not.toMatch(DOCS);
  });

  it("downloads the PDF of the Japanese page in Japanese, with the words and the drawing of the page", async () => {
    const user = userEvent.setup();
    downloadErDiagramPdf.mockClear();
    await i18n.changeLanguage("ja");
    try {
      render(<ErDiagramPage />);
      await user.click(screen.getByRole("button", { name: "PDFをダウンロード" }));
      await waitFor(() => expect(downloadErDiagramPdf).toHaveBeenCalledTimes(1));
      const [{ language, diagram, texts, relationshipRows, uniqueDetails, ruleRows }] = downloadErDiagramPdf.mock.calls[0];
      expect(language).toBe("ja");
      expect(diagram).toEqual(buildDiagram("ja"));
      expect(texts.title).toBe("冷蔵庫工場 Mini ERP - ER図");
      expect(texts.subtitle).toMatch(/^テーブル16個、リレーション18個。/);
      expect(texts.columns).toEqual(["親", "子", "外部キー", "親：子", "意味", "削除ルール"]);
      expect(texts.notes[0]).toMatch(/^請求書と領収書は/);
      // the names stay names; the words are Japanese; the codes stay codes
      expect(relationshipRows[0]).toEqual(["CUSTOMER", "QT_REFERENCE", "customer_id", "1 : 0..N", "持つ", "顧客が使用中なら `409 IN_USE`"]);
      expect(uniqueDetails[0]).toBe("User.email（小文字で比較）");
      expect(ruleRows[0]).toEqual(["製造開始（`POST /orders/:id/start`）", "ProductionOrder.started_at, MaterialLot, StockChange", expect.stringMatching(/^全明細の部品表/)]);
      const all = [...Object.values(texts).flat(), ...relationshipRows.flat(), ...uniqueDetails, ...ruleRows.flat()];
      for (const text of all) expect(text).not.toMatch(DOCS);
    } finally {
      await i18n.changeLanguage("en");
    }
  });
});
