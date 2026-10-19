import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("./erPdf", () => ({ downloadErDiagramPdf: vi.fn(async () => {}) }));

import i18n from "@/i18n";

import { buildDiagram } from "./erLayout";
import { ENTITIES, NOTES, RELATIONSHIPS, VERSION_ADDED } from "./erModel";
import { downloadErDiagramPdf } from "./erPdf";
import { ErDiagramPage } from "./ErDiagramPage";

// The ER Diagram page is ER Diagram.md: its title, the diagram, the section "What Version 2.0 added" and the "Notes", in that
// order and nothing else; "Download PDF" sends the same, in the language of the page. It never names the documents it comes from.

const DOCS = /\.md\b|ProjectdocInfo|DB Relations|docs\//i;

describe("the ER Diagram page", () => {
  it("has the title of the .md, then the diagram, What Version 2.0 added and the Notes, and nothing else", () => {
    render(<ErDiagramPage />);
    expect(screen.getByRole("heading", { level: 1, name: "ER Diagram" })).toBeInTheDocument();
    const drawing = screen.getByRole("img", { name: `ER Diagram: ${ENTITIES.length} tables and ${RELATIONSHIPS.length} relationships` });
    for (const entity of ENTITIES) expect(within(drawing).getByText(entity.name)).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["What Version 2.0 added", "Notes"]);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + VERSION_ADDED.rows.length);
    expect(within(table).getAllByRole("row")[1]).toHaveTextContent(/^PurchaseNew tables Supplier, SupplierMaterial/);
    expect(screen.getAllByRole("listitem")).toHaveLength(NOTES.length);
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Attachment is polymorphic (owner_type + owner_id)");
    expect(document.body.textContent).not.toMatch(DOCS);
  });

  it("shows the words of the .md in Japanese on the Japanese page, and keeps the names, values and codes", async () => {
    await i18n.changeLanguage("ja");
    try {
      render(<ErDiagramPage />);
      expect(screen.getByRole("heading", { level: 1, name: "ER図" })).toBeInTheDocument();
      const drawing = screen.getByRole("img", { name: `ER図：テーブル${ENTITIES.length}個、リレーション${RELATIONSHIPS.length}個` });
      expect(within(drawing).getByText("確定で作成する")).toBeInTheDocument(); // the label "confirm creates"
      expect(within(drawing).getByText("アップロードする")).toBeInTheDocument(); // the label "uploads"
      expect(within(drawing).getByText("PRODUCTION_ORDER")).toBeInTheDocument();
      expect(within(drawing).getByText("Admin | Worker")).toBeInTheDocument();
      expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["バージョン2.0で追加されたもの", "補足"]);
      expect(within(screen.getByRole("table")).getAllByRole("row")[0]).toHaveTextContent("変更元変更");
      expect(within(screen.getByRole("table")).getAllByRole("row")[5]).toHaveTextContent("材料unit を追加（POの明細に単位が必要）");
      expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Attachment はポリモーフィック");
      expect(document.body.textContent).not.toMatch(DOCS);
    } finally {
      await i18n.changeLanguage("en");
    }
  });

  it("downloads the PDF of the English page in English: the drawing and the sections of the page, plain ASCII for the font of the PDF", async () => {
    const user = userEvent.setup();
    downloadErDiagramPdf.mockClear();
    render(<ErDiagramPage />);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await waitFor(() => expect(downloadErDiagramPdf).toHaveBeenCalledTimes(1));
    const [{ language, paper, diagram, texts, added, notes, fileName }] = downloadErDiagramPdf.mock.calls[0];
    expect([language, paper]).toEqual(["en", "a3"]);
    expect(diagram).toEqual(buildDiagram("en"));
    expect(fileName).toMatch(/^er-diagram-\d{4}-\d{2}-\d{2}\.pdf$/);
    expect(texts).toEqual({ system: "Refrigerator Factory Mini ERP", title: "ER Diagram", footer: expect.stringMatching(/^Made on /), notesTitle: "Notes" });
    expect(added).toEqual(VERSION_ADDED);
    expect(notes).toEqual(NOTES);
    for (const text of [...Object.values(texts), ...added.rows.flat(), ...notes]) expect(text).toMatch(/^[\x20-\x7e]*$/);
  });

  it("downloads the PDF of the Japanese page in Japanese, with the words and the drawing of the page", async () => {
    const user = userEvent.setup();
    downloadErDiagramPdf.mockClear();
    await i18n.changeLanguage("ja");
    try {
      render(<ErDiagramPage />);
      await user.click(screen.getByRole("button", { name: "PDFをダウンロード" }));
      await waitFor(() => expect(downloadErDiagramPdf).toHaveBeenCalledTimes(1));
      const [{ language, diagram, texts, added, notes }] = downloadErDiagramPdf.mock.calls[0];
      expect(language).toBe("ja");
      expect(diagram).toEqual(buildDiagram("ja"));
      expect(texts.title).toBe("ER図");
      expect(added.title).toBe("バージョン2.0で追加されたもの");
      expect(notes[1]).toBe("`PurchasePayment` は PO に保存され、経理のテーブルを通りません。");
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
