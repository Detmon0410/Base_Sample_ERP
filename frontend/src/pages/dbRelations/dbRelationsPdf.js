import { createTextPdf } from "@/utils/textPdf";

import { splitRelations } from "./relations";

/**
 * Saves the DB Relations page as a PDF, landscape A4 or A3 (`paper`), in the language of the page, with the content of the page: the
 * title, then each part of the .md (the summary, Part 1, Part 2) with its intro, its tables (a long table goes on over the next
 * page), lists and chain sketches, under the titles of the .md. `parts` come from the page, already in that language:
 * [{ title, intro, sections: [{ title, head, rows, mono, groups } | { title, items } | { title, chain }] }]; the summary (`groups`)
 * is a block a group: its name, its tables and its main relations one a line.
 * `texts` is { system, title, footer }.
 */
export async function downloadDbRelationsPdf({ language, paper = "a4", parts, texts, fileName }) {
  const doc = await createTextPdf(language, { paper, frame: { system: texts.system, document: texts.title, footer: texts.footer } });
  doc.setProperties({ title: `${texts.system} - ${texts.title}` });

  doc.titleBlock(texts.title);
  for (const part of parts) {
    doc.section(part.title, { numbered: false });
    doc.paragraph(part.intro, "#5b6168");
    doc.space(2);
    for (const section of part.sections) {
      if (section.title) doc.heading(section.title, { numbered: false });
      if (section.chain) doc.pre(section.chain);
      else if (section.items) doc.bullets(section.items);
      else if (section.groups) doc.groups(section.head, section.rows.map(([group, tables, relations]) => ({ group, tables, relations: splitRelations(relations) })));
      else doc.table(section.head, section.rows, { mono: section.mono });
    }
  }
  doc.save(fileName);
}
