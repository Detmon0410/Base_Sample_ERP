import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Md } from "@/components/common/MdText";
import { PageHeader } from "@/components/common/PageHeader";
import { PdfDownload } from "@/components/common/PdfDownload";
import { Skeleton } from "@/components/ui/skeleton";
import { inLanguage } from "@/i18n/mdJa";
import { todayIso } from "@/utils/dates";

import { SECTIONS } from "./flowChart";
import { downloadFlowChartPdf } from "./flowChartPdf";
import { forChart, translateCode } from "./flowLabels";
import { renderChart } from "./flowRender";

/**
 * The flow charts of the system (Admin), as written in ProjectdocInfo/Flow Chart.md: the main flow, the purchase flow, the status
 * of a PO, a QT, an order, a process and an invoice, the stock changes and the checks of Confirm QT, each with its notes. The
 * charts are the mermaid code of the .md, drawn by mermaid; their words follow the language of the page (i18n/mdJa.js), the
 * names of the states and tables stay as they are. "Download PDF" saves the same charts as a portrait PDF, A4 or A3.
 */
export function FlowChartPage() {
  const { t, i18n } = useTranslation("flowChart");
  const language = i18n.language;
  const tr = (text) => inLanguage(text, language);
  const [charts, setCharts] = useState({ language: null, svgs: [], failed: false });
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState("a4");

  // draw the charts in the language of the page, one after the other (mermaid draws one chart at a time)
  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const svgs = [];
        for (const section of SECTIONS) svgs.push(await renderChart(translateCode(section.code, (text) => forChart(inLanguage(text, language)))));
        if (current) setCharts({ language, svgs, failed: false });
      } catch {
        if (current) setCharts({ language, svgs: [], failed: true });
      }
    })();
    return () => {
      current = false;
    };
  }, [language]);

  const ready = charts.language === language && !charts.failed && charts.svgs.length === SECTIONS.length;

  const download = async () => {
    setBusy(true);
    try {
      await downloadFlowChartPdf({
        language,
        paper,
        sections: SECTIONS.map((section, index) => ({ title: tr(section.title), svg: charts.svgs[index], notes: section.notes.map(tr) })),
        texts: { system: t("common:pdf.system"), title: t("title"), subtitle: t("pdfSubtitle", { charts: SECTIONS.length }), footer: t("common:pdf.madeOn", { date: todayIso() }) },
        fileName: `flow-chart-${todayIso()}.pdf`,
      });
    } catch {
      toast.error(t("pdfFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={<PdfDownload paper={paper} onPaperChange={setPaper} busy={busy || !ready} onDownload={download} label={t("downloadPdf")} busyLabel={busy ? t("makingPdf") : t("downloadPdf")} />}
      />

      {charts.failed && charts.language === language ? (
        <p role="alert" className="mb-4 text-destructive">
          {t("chartsFailed")}
        </p>
      ) : null}

      {SECTIONS.map((section, index) => (
        <section key={section.title} className="mb-8" aria-labelledby={`flow-${index}`}>
          <h2 id={`flow-${index}`} className="mb-3 text-lg font-bold">
            {tr(section.title)}
          </h2>
          <div className="overflow-x-auto border border-border bg-white p-4">
            {ready ? (
              <div role="img" aria-label={tr(section.title)} className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: charts.svgs[index] }} />
            ) : (
              <Skeleton className="mx-auto h-48 w-full max-w-xl" aria-label={t("drawing")} />
            )}
          </div>
          {section.notes.map((note) => (
            <p key={note} className="mt-2 text-muted-foreground">
              <Md text={tr(note)} />
            </p>
          ))}
        </section>
      ))}
    </>
  );
}
