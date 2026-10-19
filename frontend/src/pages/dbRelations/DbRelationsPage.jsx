import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Md, TextTable } from "@/components/common/MdText";
import { PageHeader } from "@/components/common/PageHeader";
import { PdfDownload } from "@/components/common/PdfDownload";
import { inLanguage } from "@/i18n/mdJa";
import { todayIso } from "@/utils/dates";

import { PARTS, TITLE } from "./dbRelations";
import { downloadDbRelationsPdf } from "./dbRelationsPdf";
import { isGroupTable, splitRelations, splitTables } from "./relations";

/**
 * The groups of the summary, a card each: the name of the group, its tables as tags, its main relations one a line (the .md writes
 * them as sentences in one cell, which is hard to read). `head` gives the words "Tables" and "Main relations" in the page language.
 */
function GroupCards({ head, rows }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rows.map(([group, tables, relations]) => (
        <article key={group} aria-label={group} className="border border-border border-l-4 border-l-primary bg-card p-4">
          <h4 className="mb-3 text-base font-bold text-primary">{group}</h4>
          <dl className="grid gap-x-4 gap-y-3 sm:grid-cols-[9rem_1fr]">
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{head[1]}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {splitTables(tables).map((name) => (
                <span key={name} className="border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {name}
                </span>
              ))}
            </dd>
            <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{head[2]}</dt>
            <dd>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {splitRelations(relations).map((relation) => (
                  <li key={relation}>
                    <Md text={relation} />
                  </li>
                ))}
              </ul>
            </dd>
          </dl>
        </article>
      ))}
    </div>
  );
}

/** The columns that hold names of the database: a monospaced font. */
const NAME_COLUMNS = ["Table", "Column"];

/**
 * The DB Relations page (Admin): ProjectdocInfo/DB Relations.md, the same content in the same order: the title of the .md, the
 * "Current version summary (as built)" (its groups as cards, its rules to remember), "Part 1: The base tables" and "Part 2: Added or
 * changed in Version 2.0", each with its intro, tables and chain. The words follow the language of the page (i18n/mdJa.js); the names and the chain sketches stay as they are.
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
    sections: part.sections.map((section) => {
      const title = section.title ? tr(section.title) : "";
      if (section.chain) return { title, chain: section.chain };
      if (section.items) return { title, items: section.items.map(tr) };
      return {
        title,
        head: section.head.map(tr),
        rows: section.rows.map((row) => row.map(tr)),
        mono: section.head.map((head, index) => (NAME_COLUMNS.includes(head) ? index : -1)).filter((index) => index >= 0),
        groups: isGroupTable(section.head), // the summary: a card a group (page and PDF)
      };
    }),
  }));

  const download = async () => {
    setBusy(true);
    try {
      await downloadDbRelationsPdf({
        language,
        paper,
        parts,
        texts: { system: t("common:pdf.system"), title: tr(TITLE), footer: t("common:pdf.madeOn", { date: todayIso() }) },
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
        title={tr(TITLE)}
        actions={<PdfDownload paper={paper} onPaperChange={setPaper} busy={busy} onDownload={download} label={t("downloadPdf")} busyLabel={t("makingPdf")} />}
      />

      {parts.map((part) => (
        <section key={part.title} className="mb-8">
          <h2 className="mb-1 text-xl font-bold">{part.title}</h2>
          <p className="mb-4 text-muted-foreground">
            <Md text={part.intro} />
          </p>
          {part.sections.map((section, index) => (
            <div key={`${section.title}-${index}`} className="mb-5">
              {section.title ? <h3 className="mb-2 text-lg font-bold">{section.title}</h3> : null}
              {section.chain ? (
                <pre className="overflow-x-auto border border-border bg-card p-4 font-mono text-sm leading-relaxed">{section.chain}</pre>
              ) : section.items ? (
                <ul className="list-disc space-y-1 pl-6">
                  {section.items.map((item) => (
                    <li key={item}>
                      <Md text={item} />
                    </li>
                  ))}
                </ul>
              ) : section.groups ? (
                <GroupCards head={section.head} rows={section.rows} />
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
