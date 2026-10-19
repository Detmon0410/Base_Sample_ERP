import { createTextPdf } from "@/utils/textPdf";

import { svgToCanvas } from "./flowRender";

const SCALE = 3; // the charts are pictures in the PDF: three times their size on the page, sharp when printed

/**
 * Saves a page of charts (Flow Chart, User Flow) as a PDF, A4 or A3 (`paper`), portrait (the charts run from top to bottom), in
 * the language of the page, with the content of the page: the title, then each section with its blocks in order (a chart, a table,
 * a paragraph). `sections` come from the page, already drawn and in that language: [{ title, blocks: [{ svg } | { table } |
 * { text }] }]. `texts` is { system, footer }.
 */
export async function downloadMermaidDocPdf({ language, paper = "a4", title, sections, texts, fileName }) {
  const pictures = new Map();
  for (const section of sections) for (const block of section.blocks) if (block.svg) pictures.set(block, await svgToCanvas(block.svg, SCALE));
  const doc = await createTextPdf(language, { paper, orientation: "portrait", frame: { system: texts.system, document: title, footer: texts.footer } });
  doc.setProperties({ title: `${texts.system} - ${title}` });

  doc.titleBlock(title);
  const TITLE = 14; // a section title and the space under it
  for (const section of sections) {
    // the title stays with its first block: a chart is made a little smaller to fit the rest of this page when at least about half
    // of it fits there; else the title and the chart start the next page
    const first = section.blocks[0];
    if (first && pictures.has(first)) {
      const { height } = doc.imageSize(pictures.get(first), SCALE);
      if (doc.rest - TITLE < height && doc.rest - TITLE < height * 0.55) doc.newPage();
    }
    doc.section(section.title, { numbered: false });
    for (const block of section.blocks) {
      if (pictures.has(block)) doc.image(pictures.get(block), SCALE, doc.rest - 2);
      else if (block.table) doc.table(block.table.head, block.table.rows);
      else doc.paragraph(block.text);
    }
    doc.space(4);
  }
  doc.save(fileName);
}
