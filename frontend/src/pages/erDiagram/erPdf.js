import { createTextPdf } from "@/utils/textPdf";

/** The ends of a relationship in the table of the PDF: 1, 0..1, 1..N, 0..N. */
export const CARDINALITY = { one: "1", zeroOne: "0..1", oneMany: "1..N", zeroMany: "0..N" };

/**
 * Saves the ER diagram page as a PDF (A3 landscape) in the language of the page: page 1 is the drawing, then the notes and the
 * relationships, in the order of the page. Everything comes ready to write, in that language:
 *   `diagram`          buildDiagram(language) of erLayout.js
 *   `texts`            { title, subtitle, relationshipsTitle, columns: [5 headers], notesTitle }
 *   `relationshipRows` [parent, child, foreign key, "1 : 0..N", meaning] for each relationship
 *   `notes`            the notes of the .md
 */
export async function downloadErDiagramPdf({ language, diagram, texts, relationshipRows, notes, fileName }) {
  const doc = await createTextPdf(language);
  doc.setProperties({ title: texts.title, subject: texts.subtitle });

  doc.header(texts.title, texts.subtitle);
  doc.drawing(diagram);

  doc.header(texts.notesTitle, texts.subtitle);
  for (const note of notes) doc.paragraph(note, "- ");
  doc.y += 6;
  doc.heading(texts.relationshipsTitle);
  doc.table(texts.columns, relationshipRows, [70, 70, 70, 40, doc.roomWidth - 250]);

  doc.save(fileName);
}
