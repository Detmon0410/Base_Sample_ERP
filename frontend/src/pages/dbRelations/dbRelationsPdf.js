import { createTextPdf } from "@/utils/textPdf";

/**
 * Saves the DB relations page as a PDF (A3 landscape) in the language of the page: the title, then each part with its intro, its
 * tables (a long table goes on over the next page) and its chain sketch. `parts` come from the page, already in that language:
 * [{ title, intro, sections: [{ title, head, rows } | { title, chain }] }]. `texts` is { title, subtitle }.
 */
export async function downloadDbRelationsPdf({ language, parts, texts, fileName }) {
  const doc = await createTextPdf(language);
  doc.setProperties({ title: texts.title, subject: texts.subtitle });
  doc.header(texts.title, texts.subtitle);
  for (const part of parts) {
    doc.heading(part.title, 15);
    doc.paragraph(part.intro);
    doc.y += 3;
    for (const section of part.sections) {
      doc.heading(section.title);
      if (section.chain) doc.pre(section.chain);
      else doc.table(section.head, section.rows);
    }
  }
  doc.save(fileName);
}
