import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Md, TextTable } from "@/components/common/MdText";
import { PageHeader } from "@/components/common/PageHeader";
import { PdfDownload } from "@/components/common/PdfDownload";
import { inLanguage } from "@/i18n/mdJa";
import { todayIso } from "@/utils/dates";

import { PARTS } from "./dbRelations";
import { downloadDbRelationsPdf } from "./dbRelationsPdf";

/** The columns that hold names of the database: a monospaced font. */
const NAME_COLUMNS = ["Table", "Column"];

/**
 * The relations of the database (Admin), as written in ProjectdocInfo/DB Relations.md: its two parts (the base tables, then what
 * Version 2.0 added or changed), each with its foreign keys and delete rules, unique keys, rules that touch several tables and the
 * chain of the flow. The words follow the language of the page (i18n/mdJa.js); the names and the chain sketches stay as they are.
 * "Download PDF" saves the same content as a PDF in that language, on landscape A4 (the default) or A3.
 */
export function DbRelationsPage() {
  const { t, i18n } = useTranslation("dbRelations");
  const [busy, setBusy] = useState(false);
  const [paper, setPaper] = useState("a4");
  const language = i18n.language;
  const tr = (text) => inLanguage(text, language);
  const japanese = String(language).startsWith("ja");
  // the parts in the language of the page, ready for the page and the PDF
  const parts = PARTS.map((part) => ({
    title: tr(part.title),
    intro: part.intro.map(tr).join(japanese ? "" : " "),
    sections: part.sections.map((section) =>
      section.chain
        ? { title: tr(section.title), chain: section.chain }
        : {
            title: tr(section.title),
            head: section.head.map(tr),
            rows: section.rows.map((row) => row.map(tr)),
            mono: section.head.map((head, index) => (NAME_COLUMNS.includes(head) ? index : -1)).filter((index) => index >= 0),
          },
    ),
  }));

  const download = async () => {
    setBusy(true);
    try {
      await downloadDbRelationsPdf({
        language,
        paper,
        parts,
        texts: { system: t("common:pdf.system"), title: t("title"), subtitle: t("pdfSubtitle"), footer: t("common:pdf.madeOn", { date: todayIso() }) },
        fileName: `db-relations-${todayIso()}.pdf`,
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
        actions={<PdfDownload paper={paper} onPaperChange={setPaper} busy={busy} onDownload={download} label={t("downloadPdf")} busyLabel={t("makingPdf")} />}
      />

      {parts.map((part) => (
        <section key={part.title} className="mb-8">
          <h2 className="mb-1 text-xl font-bold">{part.title}</h2>
          <p className="mb-4 text-muted-foreground">
            <Md text={part.intro} />
          </p>
          {part.sections.map((section) => (
            <div key={section.title} className="mb-5">
              <h3 className="mb-2 text-lg font-bold">{section.title}</h3>
              {section.chain ? (
                <pre className="overflow-x-auto border border-border bg-card p-4 font-mono text-sm leading-relaxed">{section.chain}</pre>
              ) : (
                <TextTable heads={section.head} rows={section.rows} mono={section.mono} />
              )}
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
