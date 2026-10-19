import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Md, TextTable } from "@/components/common/MdText";
import { PageHeader } from "@/components/common/PageHeader";
import { PdfDownload } from "@/components/common/PdfDownload";
import { Skeleton } from "@/components/ui/skeleton";
import { inLanguage } from "@/i18n/mdJa";
import { todayIso } from "@/utils/dates";

import { forChart, translateCode } from "./flowLabels";
import { downloadMermaidDocPdf } from "./mermaidDocPdf";
import { renderChart } from "./flowRender";

/**
 * A page that is one .md of charts (Flow Chart.md, User Flow.md), with the same content: the title of the .md, then each of its
 * sections with its blocks in order: a chart (the mermaid code of the .md, drawn by mermaid), a table, a paragraph. The words follow
 * the language of the page (i18n/mdJa.js); the names and values stay as they are. "Download PDF" saves the same, A4 or A3, portrait.
 * `title` and `sections` come from the data of the .md; `fileName` names the PDF.
 */
export function MermaidDocPage({ title, sections, fileName }) {
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
        for (const code of JSON.parse(codes)) svgs.push(await renderChart(translateCode(code, (text) => forChart(inLanguage(text, language)))));
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
      if (block.table) return { table: { head: block.table.head.map(tr), rows: block.table.rows.map((row) => row.map(tr)) } };
      return { text: tr(block.text) };
    }),
  }));

  const download = async () => {
    setBusy(true);
    try {
      await downloadMermaidDocPdf({ language, paper, title: tr(title), sections: shown, texts: { system: t("pdf.system"), footer: t("pdf.madeOn", { date: todayIso() }) }, fileName: `${fileName}-${todayIso()}.pdf` });
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
            if (block.table) {
              return (
                <div key={blockIndex} className="mb-3">
                  <TextTable heads={block.table.head} rows={block.table.rows} />
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
