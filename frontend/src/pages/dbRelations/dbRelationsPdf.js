import { createTextPdf } from "@/utils/textPdf";

/**
 * Saves the DB relations page as a PDF, landscape A4 or A3 (`paper`), in the language of the page: the title block, then each part
 * as a numbered section with its intro, its tables (a long table goes on over the next page) and its chain sketch. `parts` come
 * from the page, already in that language: [{ title, intro, sections: [{ title, head, rows, mono } | { title, chain }] }].
 * `texts` is { system, title, subtitle, footer }.
 */
export async function downloadDbRelationsPdf({ language, paper = "a4", parts, texts, fileName }) {
  const doc = await createTextPdf(language, { paper, frame: { system: texts.system, document: texts.title, footer: texts.footer } });
  doc.setProperties({ title: `${texts.system} - ${texts.title}`, subject: texts.subtitle });

  doc.titleBlock(texts.title, texts.subtitle);
  for (const part of parts) {
    doc.section(part.title, { numbered: false }); // "Part 1: ..." has its number
    doc.paragraph(part.intro, "#5b6168");
    doc.space(2);
    for (const section of part.sections) {
      doc.heading(section.title);
      if (section.chain) doc.pre(section.chain);
      else doc.table(section.head, section.rows, { mono: section.mono });
    }
  }
  doc.save(fileName);
}
