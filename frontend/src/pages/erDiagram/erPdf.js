import { createTextPdf } from "@/utils/textPdf";

/**
 * Saves the ER Diagram page as a PDF, landscape A3 or A4 (`paper`), in the language of the page, with the content of the page: the
 * title and the framed drawing on page 1, then the section "What Version 2.0 added" (a table) and the "Notes". Everything comes ready
 * to write, in that language:
 *   `diagram`  buildDiagram(language) of erLayout.js
 *   `texts`    { system, title, footer, notesTitle }
 *   `added`    { title, head, rows }: the table "What Version 2.0 added"
 *   `notes`    the notes of the .md
 */
export async function downloadErDiagramPdf({ language, paper = "a3", diagram, texts, added, notes, fileName }) {
  const doc = await createTextPdf(language, { paper, frame: { system: texts.system, document: texts.title, footer: texts.footer } });
  doc.setProperties({ title: `${texts.system} - ${texts.title}` });

  doc.titleBlock(texts.title);
  doc.drawing(diagram);

  doc.newPage();
  doc.section(added.title, { numbered: false });
  doc.table(added.head, added.rows, { widths: [1, 5] });
  doc.section(texts.notesTitle, { numbered: false });
  doc.bullets(notes);

  doc.save(fileName);
}
