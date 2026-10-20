import { useTranslation } from "react-i18next";

import { AppLogo } from "@/components/common/AppLogo";
import { COMPANY } from "@/config/company";
import { cn } from "@/lib/utils";

// The pieces of every paper of the system (QT, invoice, receipt, purchase order): the same header with the logo, the same boxes, the same table,
// the same signature lines, so the papers look like one set. They are drawn with plain borders so the PDF and the print match the page.

/** The logo of the company (the picture in public/logo.png). */
export function Logo({ className }) {
  return <AppLogo className={cn("size-16", className)} />;
}

/** The top of a paper: the logo and the company at the left, the title, the number and the date at the right. `title` is the <h2> of the paper. */
export function PaperHeader({ title, number, date }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-foreground pb-4">
      <div className="flex items-center gap-3">
        <Logo />
        <div>
          <p className="text-xl font-bold">{COMPANY.name}</p>
          <p className="text-sm text-muted-foreground">{COMPANY.address}</p>
          <p className="text-sm text-muted-foreground">
            {COMPANY.phone} / {COMPANY.email}
          </p>
        </div>
      </div>
      <div className="text-right">
        <h2 className="text-3xl font-bold tracking-wide text-primary uppercase">{title}</h2>
        <p className="text-lg font-bold">{number}</p>
        {date ? <p className="text-sm text-muted-foreground">{date}</p> : null}
      </div>
    </header>
  );
}

/** A box with a small heading: "Bill to" and the customer, or "Details". */
export function PaperBox({ label, children, className }) {
  return (
    <section className={cn("border border-foreground/70", className)}>
      <h3 className="border-b border-foreground/70 bg-[#f1f5f8] px-3 py-1 text-xs font-bold tracking-wide uppercase">{label}</h3>
      <div className="px-3 py-2 text-sm">{children}</div>
    </section>
  );
}

/** Rows of "name: value" for a box (the invoice date, the order, the required date). */
export function PaperFacts({ rows }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {rows
        .filter(([, value]) => value)
        .map(([name, value]) => (
          <div key={name} className="contents">
            <dt className="text-muted-foreground">{name}</dt>
            <dd className="text-right font-semibold">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

/** The two boxes under the header: who it is for (at the left, wider) and the facts of the paper (at the right). */
export function PaperParties({ partyLabel, name, address, factsLabel, facts }) {
  return (
    <div className="mt-5 grid gap-4 sm:grid-cols-[3fr_2fr]">
      <PaperBox label={partyLabel}>
        <p className="text-base font-bold">{name}</p>
        <p className="whitespace-pre-line text-muted-foreground">{address}</p>
      </PaperBox>
      <PaperBox label={factsLabel}>
        <PaperFacts rows={facts} />
      </PaperBox>
    </div>
  );
}

/**
 * The lines: `columns` is [{ key, header, align?, cell(row, index) }]. A numbered first column is added. The table scrolls sideways on a narrow
 * screen instead of breaking, because it is a paper.
 */
export function PaperTable({ columns, rows, rowKey }) {
  const { t } = useTranslation("common");
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full border-collapse border border-foreground/70 text-sm">
        <thead>
          <tr className="bg-[#f1f5f8] text-xs tracking-wide uppercase">
            <th className="w-10 border border-foreground/70 px-2 py-1.5 text-center">{t("paper.number")}</th>
            {columns.map((column) => (
              <th key={column.key} className={cn("border border-foreground/70 px-2 py-1.5", column.align === "right" ? "text-right" : "text-left")}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)}>
              <td className="border border-foreground/70 px-2 py-1.5 text-center tabular-nums">{index + 1}</td>
              {columns.map((column) => (
                <td key={column.key} className={cn("border border-foreground/70 px-2 py-1.5", column.align === "right" && "text-right tabular-nums")}>
                  {column.cell(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The total at the right, in a box. `label` and `value` are printed as one text ("Total: ¥750"). `note` is the small line under it. */
export function PaperTotal({ text, note }) {
  return (
    <div className="mt-4 flex flex-col items-end gap-1">
      <p className="min-w-60 border-2 border-foreground bg-[#f1f5f8] px-4 py-2 text-right text-xl font-bold tabular-nums">{text}</p>
      {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

/** Notes and terms in a box. Nothing is drawn when there is no text. */
export function PaperNotes({ title, children }) {
  if (!children) return null;
  return (
    <PaperBox label={title} className="mt-5">
      <div className="whitespace-pre-line">{children}</div>
    </PaperBox>
  );
}

/** Blank lines to sign: `labels` is the names under the lines. */
export function Signatures({ labels }) {
  const { t } = useTranslation("common");
  return (
    <div className={cn("mt-14 grid gap-8 text-center text-sm", labels.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
      {labels.map((label) => (
        <div key={label}>
          <div className="h-14 border-b border-foreground" />
          <p className="mt-1 font-semibold">{label}</p>
          <p className="text-muted-foreground">{t("paper.dateLine")}</p>
        </div>
      ))}
    </div>
  );
}

/** The sheet kept out of sight: the page shows only the buttons Download PDF and Print, which use it. It is drawn off the screen at the width of a desktop so the PDF has the same layout on every screen. */
export function HiddenPaper({ children }) {
  return (
    <div aria-hidden="true" data-print-holder className="pointer-events-none fixed top-0 -left-[10000px] w-[800px]">
      {children}
    </div>
  );
}

/** The sheet itself: white, with the thin frame on the screen; `name` is its `data-print-doc`. */
export function Paper({ name, children }) {
  return (
    <article data-print-doc={name} className="max-w-3xl rounded-md border border-border bg-white p-8 text-foreground shadow-sm">
      {children}
    </article>
  );
}
