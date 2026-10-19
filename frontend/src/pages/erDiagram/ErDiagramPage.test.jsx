import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("./erPdf", async (importOriginal) => ({ ...(await importOriginal()), downloadErDiagramPdf: vi.fn(async () => {}) }));

import i18n from "@/i18n";

import { buildDiagram } from "./erLayout";
import { ENTITIES, NOTES, RELATIONSHIPS } from "./erModel";
import { downloadErDiagramPdf } from "./erPdf";
import { ErDiagramPage } from "./ErDiagramPage";

// The ER diagram page: the drawing has every table, the notes and the table of the relationships follow, and "Download PDF" sends
// the same drawing and words as the page, in its language. The page and the PDF never name the documents they come from.

const DOCS = /\.md\b|ProjectdocInfo|DB Relations|docs\//i; // not "ER diagram": that is the name of the page

describe("the ER diagram page", () => {
  it("draws every table, writes the notes and lists every relationship", () => {
    render(<ErDiagramPage />);
    const drawing = screen.getByRole("img", { name: `ER diagram: ${ENTITIES.length} tables and ${RELATIONSHIPS.length} relationships` });
    for (const entity of ENTITIES) expect(within(drawing).getByText(entity.name)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(NOTES.length);
    expect(screen.getByText("polymorphic", { exact: false }).closest("li")).toHaveTextContent("Attachment is polymorphic (owner_type + owner_id)");

    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(RELATIONSHIPS.length);
    // as in ER Diagram.md: QT_REFERENCE ||--o| PRODUCTION_ORDER : "confirm creates"; a line to ATTACHMENT has no database key
    expect(rows[3]).toHaveTextContent("QT_REFERENCEPRODUCTION_ORDERqt_idexactly one : zero or oneconfirm creates");
    const filesOf = rows.find((row) => /^PURCHASE_ORDERATTACHMENT/.test(row.textContent));
    expect(filesOf).toHaveTextContent("PURCHASE_ORDERATTACHMENTowner_type + owner_idexactly one : zero or manyfiles");
    // the keys of the database drawn too: the order and the user of a stock change, the user who uploads a file
    expect(rows.find((row) => /^USERATTACHMENT/.test(row.textContent))).toHaveTextContent("USERATTACHMENTuploaded_byexactly one : zero or manyuploads");
    expect(rows.find((row) => /^PRODUCTION_ORDERSTOCK_CHANGE/.test(row.textContent))).toHaveTextContent("order_idzero or one : zero or manystart deducts");
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("shows the words of the .md in Japanese on the Japanese page, and keeps the names, values and codes", async () => {
    await i18n.changeLanguage("ja");
    try {
      render(<ErDiagramPage />);
      const drawing = screen.getByRole("img", { name: `ER図：テーブル${ENTITIES.length}個、リレーション${RELATIONSHIPS.length}個` });
      expect(within(drawing).getByText("確定で作成する")).toBeInTheDocument(); // the label "confirm creates"
      expect(within(drawing).getByText("初期単価")).toBeInTheDocument(); // the note "initial price"
      expect(within(drawing).getByText("データベースのキーなし")).toBeInTheDocument();
      expect(within(drawing).getByText("PRODUCTION_ORDER")).toBeInTheDocument();
      expect(within(drawing).getByText("Admin | Worker")).toBeInTheDocument();
      expect(within(drawing).queryByText("confirm creates")).toBeNull();
      expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Attachment はポリモーフィック");
      expect(within(screen.getAllByRole("listitem")[0]).getByText("owner_type").tagName).toBe("CODE");
      expect(within(screen.getByRole("table")).getAllByRole("row")[4]).toHaveTextContent("必ず1 : 0または1確定で作成する");
      expect(within(drawing).getByText("アップロードする")).toBeInTheDocument(); // the label "uploads"
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
    const [{ language, paper, diagram, texts, relationshipRows, notes, fileName }] = downloadErDiagramPdf.mock.calls[0];
    expect(language).toBe("en");
    expect(paper).toBe("a3"); // the drawing is large: A3 unless A4 is chosen
    expect(diagram).toEqual(buildDiagram("en"));
    expect(fileName).toMatch(/^er-diagram-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(texts.system).toBe("Refrigerator Factory Mini ERP");
    expect(texts.title).toBe("ER diagram");
    expect(texts.subtitle).toBe("23 tables, 32 relationships, crow's foot notation");
    expect(texts.footer).toMatch(/^Made on \d{4}-\d{2}-\d{2}$/);
    expect(texts.columns).toEqual(["Parent", "Child", "Foreign key", "Parent : child", "Meaning"]);
    expect(relationshipRows).toHaveLength(RELATIONSHIPS.length);
    expect(relationshipRows[0]).toEqual(["CUSTOMER", "QT_REFERENCE", "customer_id", "1 : 0..N", "has"]);
    expect(notes).toEqual(NOTES);
    const all = [...Object.values(texts).flat(), ...relationshipRows.flat(), ...notes];
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
      const [{ language, diagram, texts, relationshipRows, notes }] = downloadErDiagramPdf.mock.calls[0];
      expect(language).toBe("ja");
      expect(diagram).toEqual(buildDiagram("ja"));
      expect(texts.system).toBe("冷蔵庫工場 Mini ERP");
      expect(texts.title).toBe("ER図");
      expect(texts.subtitle).toBe("テーブル23個、リレーション32個、クロウズフット表記");
      expect(texts.footer).toMatch(/^\d{4}-\d{2}-\d{2} 作成$/);
      expect(texts.columns).toEqual(["親", "子", "外部キー", "親：子", "意味"]);
      expect(relationshipRows[0]).toEqual(["CUSTOMER", "QT_REFERENCE", "customer_id", "1 : 0..N", "持つ"]);
      expect(notes[1]).toBe("`PurchasePayment` は PO に保存され、経理のテーブルを通りません。");
      for (const text of [...Object.values(texts).flat(), ...relationshipRows.flat(), ...notes]) expect(text).not.toMatch(DOCS);
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("makes the PDF on the paper chosen beside the button", async () => {
    const user = userEvent.setup();
    downloadErDiagramPdf.mockClear();
    render(<ErDiagramPage />);
    await user.selectOptions(screen.getByLabelText("Paper size"), "a4");
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadErDiagramPdf).toHaveBeenCalledTimes(1));
    expect(downloadErDiagramPdf.mock.calls[0][0].paper).toBe("a4");
  });
});
