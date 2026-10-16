import { createTextPdf } from "@/utils/textPdf";

/** The ends of a relationship in the table of the PDF: 1, 0..1, 1..N, 0..N. */
export const CARDINALITY = { one: "1", zeroOne: "0..1", oneMany: "1..N", zeroMany: "0..N" };

/**
 * Saves the ER diagram page as a PDF, landscape A3 or A4 (`paper`), in the language of the page: the title block and the framed
 * drawing on page 1, then 1. the notes and 2. the relationships, in the order of the page. Everything comes ready to write:
 *   `diagram`          buildDiagram(language) of erLayout.js
 *   `texts`            { system, title, subtitle, footer, notesTitle, relationshipsTitle, columns: [5 headers] }
 *   `relationshipRows` [parent, child, foreign key, "1 : 0..N", meaning] for each relationship
 *   `notes`            the notes of the .md
 */
export async function downloadErDiagramPdf({ language, paper = "a3", diagram, texts, relationshipRows, notes, fileName }) {
  const doc = await createTextPdf(language, { paper, frame: { system: texts.system, document: texts.title, footer: texts.footer } });
  doc.setProperties({ title: `${texts.system} - ${texts.title}`, subject: texts.subtitle });

  doc.titleBlock(texts.title, texts.subtitle);
  doc.drawing(diagram);

  doc.newPage();
  doc.section(texts.notesTitle);
  doc.bullets(notes);
  doc.section(texts.relationshipsTitle);
  doc.table(texts.columns, relationshipRows, { widths: [20, 20, 20, 10, 16], mono: [0, 1, 2] });

  doc.save(fileName);
}
