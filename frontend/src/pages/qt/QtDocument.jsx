import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/common/FormFields";
import { DocumentActions } from "@/pages/invoices/Documents";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/utils/format";

/** The paper of the QT: number, date, customer, the lines with the total, the notes and blank spaces for the names and the signatures. */
function QtPaper({ qt, language }) {
  const { t } = useTranslation("master");
  return (
    <article data-print-doc="qt" className="max-w-3xl border border-border bg-white p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("qt.doc.title")}</h2>
        <dl className="text-right">
          <dt className="sr-only">{t("qt.qtNumber")}</dt>
          <dd className="text-lg font-bold">{qt.qtNumber}</dd>
          <dt className="sr-only">{t("qt.qtDate")}</dt>
          <dd>{qt.qtDate}</dd>
        </dl>
      </header>
      <p className="mt-6 text-sm font-semibold text-muted-foreground">{t("qt.doc.to")}</p>
      <p className="font-bold">{qt.customerName}</p>
      <p className="whitespace-pre-line">{qt.customerAddress}</p>

      <Table className="mt-6" data-stack>
        <TableHeader>
          <TableRow>
            <TableHead>{t("qt.lines.product")}</TableHead>
            <TableHead className="text-right">{t("qt.lines.quantity")}</TableHead>
            <TableHead className="text-right">{t("qt.lines.unitPrice")}</TableHead>
            <TableHead className="text-right">{t("qt.lines.amount")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {qt.lines.map((line) => (
            <TableRow key={line.productId}>
              <TableCell data-label={t("qt.lines.product")}>
                {line.productCode} {line.productName}
              </TableCell>
              <TableCell data-label={t("qt.lines.quantity")} className="text-right">
                {formatNumber(line.quantity, language)}
              </TableCell>
              <TableCell data-label={t("qt.lines.unitPrice")} className="text-right">
                {formatCurrency(line.unitPrice, language)}
              </TableCell>
              <TableCell data-label={t("qt.lines.amount")} className="text-right">
                {formatCurrency(line.amount, language)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-4 text-right text-xl font-bold">
        {t("qt.lines.total")}: {formatCurrency(qt.total, language)}
      </p>
      {qt.notes ? <p className="mt-4 whitespace-pre-line">{qt.notes}</p> : null}

      <div className="mt-12 grid grid-cols-3 gap-6 text-center text-sm">
        {["preparedBy", "approvedBy", "customerSign"].map((key) => (
          <div key={key}>
            <div className="h-16 border-b border-foreground" />
            <p className="mt-1">{t(`qt.doc.${key}`)}</p>
            <p className="text-muted-foreground">{t("qt.doc.dateLine")}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

/** The QT form as a paper of the page, with Download PDF and Print (any status). Only for a QT that is saved. */
export function QtDocument({ qt, language }) {
  const { t } = useTranslation("master");
  return (
    <Section icon={Printer} title={t("qt.doc.section")}>
      <div className="flex flex-col gap-4">
        <DocumentActions name="qt" number={qt.qtNumber} />
        <QtPaper qt={qt} language={language} />
      </div>
    </Section>
  );
}
