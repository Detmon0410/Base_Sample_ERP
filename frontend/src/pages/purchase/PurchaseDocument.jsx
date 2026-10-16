import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Section } from "@/components/common/FormFields";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActions } from "@/pages/invoices/Documents";
import { formatCurrency, formatNumber } from "@/utils/format";

/** The paper of the PO: number, supplier, required date, department, the lines with the total, the notes and blank spaces for the names. */
function PurchasePaper({ po, language }) {
  const { t } = useTranslation("purchase");
  return (
    <article data-print-doc="po" className="max-w-3xl border border-border bg-white p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("doc.title")}</h2>
        <dl className="text-right">
          <dt className="sr-only">{t("poNumber")}</dt>
          <dd className="text-lg font-bold">{po.poNumber}</dd>
          <dt className="sr-only">{t("doc.requiredDate")}</dt>
          <dd>
            {t("doc.requiredDate")}: {po.requiredDate}
          </dd>
          <dt className="sr-only">{t("doc.department")}</dt>
          <dd>
            {t("doc.department")}: {po.department}
          </dd>
        </dl>
      </header>
      <p className="mt-6 text-sm font-semibold text-muted-foreground">{t("doc.to")}</p>
      <p className="font-bold">{po.supplierName}</p>
      <p className="whitespace-pre-line">{po.supplierAddress}</p>

      <Table className="mt-6" data-stack>
        <TableHeader>
          <TableRow>
            <TableHead>{t("lines.material")}</TableHead>
            <TableHead className="text-right">{t("lines.quantity")}</TableHead>
            <TableHead>{t("lines.unit")}</TableHead>
            <TableHead className="text-right">{t("lines.unitPrice")}</TableHead>
            <TableHead className="text-right">{t("lines.amount")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {po.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell data-label={t("lines.material")}>
                {line.materialCode} {line.materialName}
              </TableCell>
              <TableCell data-label={t("lines.quantity")} className="text-right">
                {formatNumber(line.quantity, language)}
              </TableCell>
              <TableCell data-label={t("lines.unit")}>{line.unit}</TableCell>
              <TableCell data-label={t("lines.unitPrice")} className="text-right">
                {formatCurrency(line.unitPrice, language)}
              </TableCell>
              <TableCell data-label={t("lines.amount")} className="text-right">
                {formatCurrency(line.amount, language)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-4 text-right text-xl font-bold">
        {t("lines.total")}: {formatCurrency(po.total, language)}
      </p>
      {po.notes ? <p className="mt-4 whitespace-pre-line">{po.notes}</p> : null}

      <div className="mt-12 grid grid-cols-3 gap-6 text-center text-sm">
        {["preparedBy", "approvedBy", "receivedBy"].map((key) => (
          <div key={key}>
            <div className="h-16 border-b border-foreground" />
            <p className="mt-1">{t(`doc.${key}`)}</p>
            <p className="text-muted-foreground">{t("doc.dateLine")}</p>
          </div>
        ))}
      </div>
    </article>
  );
}

/** The PO form as a paper of the page, with Download PDF and Print (any status). */
export function PurchaseDocument({ po, language }) {
  const { t } = useTranslation("purchase");
  return (
    <Section icon={Printer} title={t("doc.section")}>
      <div className="flex flex-col gap-4">
        <DocumentActions name="po" number={po.poNumber} />
        <PurchasePaper po={po} language={language} />
      </div>
    </Section>
  );
}
