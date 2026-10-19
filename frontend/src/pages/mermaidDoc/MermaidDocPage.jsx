import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Md, TextTable } from "@/components/common/MdText";
import { PageHeader } from "@/components/common/PageHeader";
import { PdfDownload } from "@/components/common/PdfDownload";
import { Skeleton } from "@/components/ui/skeleton";
import { inLanguage } from "@/i18n/mdJa";
import { censor } from "@/utils/censor";
import { todayIso } from "@/utils/dates";

import { forChart, translateCode } from "./flowLabels";
import { downloadMermaidDocPdf } from "./mermaidDocPdf";
import { renderChart } from "./flowRender";

/**
 * A page that is one .md of charts (Flow Chart.md, User Flow.md, APIs Diagram.md), with the same content: the title of the .md, its
 * intro when it has one, then each of its sections with its blocks in order: a chart (the mermaid code of the .md, drawn by
 * mermaid), a sub-heading, a list, a table, a paragraph. The words follow the language of the page (i18n/mdJa.js); the names and values stay
 * as they are. What is never shown (utils/censor.js) is hidden, in the charts too. "Download PDF" saves the same, A4 or A3, portrait.
 * `title`, `intro` and `sections` come from the data of the .md; `fileName` names the PDF.
 */
export function MermaidDocPage({ title, intro = [], sections, fileName }) {
  const { t, i18n } = useTranslation("common");
  const language = i18n.language;
  const tr = (text) => inLanguage(text, language);
  const charts = sections.flatMap((section) => section.blocks.filter((block) => block.chart).map((block) => block.chart));
  const [drawn, setDrawn] = useState({ language: null, svgs: [], failed: false });
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState("a4");

  // draw the charts in the language of the page, one after the other (mermaid draws one chart at a time)
  const codes = JSON.stringify(charts);
  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const svgs = [];
        for (const code of JSON.parse(codes)) svgs.push(await renderChart(translateCode(code, (text) => forChart(censor(inLanguage(text, language))))));
        if (current) setDrawn({ language, svgs, failed: false });
      } catch {
        if (current) setDrawn({ language, svgs: [], failed: true });
      }
    })();
    return () => {
      current = false;
    };
  }, [codes, language]);

  const ready = drawn.language === language && !drawn.failed && drawn.svgs.length === charts.length;
  // the sections in the language of the page, each chart with its drawing
  let chartIndex = 0;
  const shown = sections.map((section) => ({
    title: tr(section.title),
    blocks: section.blocks.map((block) => {
      if (block.chart) return { svg: drawn.svgs[chartIndex++] };
      if (block.heading) return { heading: tr(block.heading) };
      if (block.items) return { items: block.items.map(tr) };
      if (block.table) return { table: { head: block.table.head.map(tr), rows: block.table.rows.map((row) => row.map(tr)), align: block.table.align } };
      return { text: tr(block.text) };
    }),
  }));

  const download = async () => {
    setBusy(true);
    try {
      await downloadMermaidDocPdf({ language, paper, title: tr(title), intro: intro.map((block) => ({ text: tr(block.text) })), sections: shown, texts: { system: t("pdf.system"), footer: t("pdf.madeOn", { date: todayIso() }) }, fileName: `${fileName}-${todayIso()}.pdf` });
    } catch {
      toast.error(t("doc.pdfFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={tr(title)} actions={<PdfDownload paper={paper} onPaperChange={setPaper} busy={busy || !ready} onDownload={download} label={t("doc.downloadPdf")} busyLabel={busy ? t("doc.makingPdf") : t("doc.downloadPdf")} />} />

      {drawn.failed && drawn.language === language ? (
        <p role="alert" className="mb-4 text-destructive">
          {t("doc.chartsFailed")}
        </p>
      ) : null}

      {intro.map((block, index) => (
        <p key={index} className="mb-3">
          <Md text={tr(block.text)} />
        </p>
      ))}

      {shown.map((section, index) => (
        <section key={section.title} className="mb-8" aria-labelledby={`doc-section-${index}`}>
          <h2 id={`doc-section-${index}`} className="mb-3 text-lg font-bold">
            {section.title}
          </h2>
          {section.blocks.map((block, blockIndex) => {
            if ("svg" in block) {
              return (
                <div key={blockIndex} className="mb-3 overflow-x-auto border border-border bg-white p-4">
                  {ready ? (
                    <div role="img" aria-label={section.title} className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: block.svg }} />
                  ) : (
                    <Skeleton className="mx-auto h-48 w-full max-w-xl" aria-label={t("doc.drawing")} />
                  )}
                </div>
              );
            }
            if (block.heading) {
              return (
                <h3 key={blockIndex} className="mt-5 mb-2 font-bold">
                  {block.heading}
                </h3>
              );
            }
            if (block.items) {
              return (
                <ul key={blockIndex} className="mb-3 list-disc space-y-1 pl-6">
                  {block.items.map((item) => (
                    <li key={item}>
                      <Md text={item} />
                    </li>
                  ))}
                </ul>
              );
            }
            if (block.table) {
              return (
                <div key={blockIndex} className="mb-3">
                  <TextTable heads={block.table.head} rows={block.table.rows} align={block.table.align} />
                </div>
              );
            }
            return (
              <p key={blockIndex} className="mb-3">
                <Md text={block.text} />
              </p>
            );
          })}
        </section>
      ))}
    </>
  );
}
