import { createTextPdf } from "@/utils/textPdf";

import { svgToCanvas } from "./flowRender";

const SCALE = 3; // the charts are pictures in the PDF: three times their size on the page, sharp when printed

/**
 * Saves the flow chart page as a PDF, A4 or A3 (`paper`), portrait (the charts run from top to bottom), in the language of the
 * page: the title block, then each section numbered with its chart and its notes. `sections` come from the page, already drawn
 * and in that language: [{ title, svg, notes }]. `texts` is { system, title, subtitle, footer }.
 */
export async function downloadFlowChartPdf({ language, paper = "a4", sections, texts, fileName }) {
  const pictures = await Promise.all(sections.map((section) => svgToCanvas(section.svg, SCALE)));
  const doc = await createTextPdf(language, { paper, orientation: "portrait", frame: { system: texts.system, document: texts.title, footer: texts.footer } });
  doc.setProperties({ title: `${texts.system} - ${texts.title}`, subject: texts.subtitle });

  doc.titleBlock(texts.title, texts.subtitle);
  const TITLE = 14; // a section title and the space under it
  sections.forEach((section, index) => {
    // the title stays with its chart: the chart is made a little smaller to fit the rest of this page when at least about half of
    // it fits there; else the title and the chart start the next page
    const { height } = doc.imageSize(pictures[index], SCALE);
    if (doc.rest - TITLE < height && doc.rest - TITLE < height * 0.55) doc.newPage();
    doc.section(section.title);
    doc.image(pictures[index], SCALE, doc.rest - 2);
    for (const note of section.notes) doc.paragraph(note, "#5b6168");
    doc.space(4);
  });
  doc.save(fileName);
}
