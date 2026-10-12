import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/utils/format";
import { downloadPdf } from "@/utils/pdf";
import { printDocument } from "@/utils/print";

// The papers of the Accounting group: the invoice and the receipt, and the two buttons that save or print a paper.

/** "Bank transfer" -> "BankTransfer", the key of its text. */
export const methodKey = (method) => String(method).split(" ").map((word) => word[0].toUpperCase() + word.slice(1)).join("");

/** The paper of the invoice (printed when `data-print-doc="invoice"` is the chosen document). */
export function InvoiceDocument({ invoice, language }) {
  const { t } = useTranslation("invoices");
  return (
    <article data-print-doc="invoice" className="max-w-3xl border border-border bg-white p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("doc.invoice")}</h2>
        <dl className="text-right">
          <dt className="sr-only">{t("number")}</dt>
          <dd className="text-lg font-bold">{invoice.invoiceNumber}</dd>
          <dt className="sr-only">{t("date")}</dt>
          <dd>{invoice.invoiceDate}</dd>
          <dt className="sr-only">{t("doc.orderRef")}</dt>
          <dd>
            {t("doc.orderRef")}: {invoice.orderNumber}
          </dd>
        </dl>
      </header>
      <p className="mt-6 text-sm font-semibold text-muted-foreground">{t("doc.to")}</p>
      <p className="font-bold">{invoice.customerName}</p>
      <p className="whitespace-pre-line">{invoice.customerAddress}</p>

      <Table className="mt-6" data-stack>
        <TableHeader>
          <TableRow>
            <TableHead>{t("doc.product")}</TableHead>
            <TableHead className="text-right">{t("doc.quantity")}</TableHead>
            <TableHead className="text-right">{t("doc.unitPrice")}</TableHead>
            <TableHead className="text-right">{t("doc.amount")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoice.lines.map((line, index) => (
            <TableRow key={index}>
              <TableCell data-label={t("doc.product")}>
                {line.productCode} {line.productName}
              </TableCell>
              <TableCell data-label={t("doc.quantity")} className="text-right">
                {formatNumber(line.quantity, language)}
              </TableCell>
              <TableCell data-label={t("doc.unitPrice")} className="text-right">
                {formatCurrency(line.unitPrice, language)}
              </TableCell>
              <TableCell data-label={t("doc.amount")} className="text-right">
                {formatCurrency(line.amount, language)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="mt-4 text-right text-xl font-bold">
        {t("doc.total")}: {formatCurrency(invoice.total, language)}
      </p>
      <p className="mt-2 text-right text-sm text-muted-foreground">{t("doc.noTax")}</p>
    </article>
  );
}

/** The paper of the receipt. */
export function ReceiptDocument({ receipt, language }) {
  const { t } = useTranslation("invoices");
  return (
    <article data-print-doc="receipt" className="max-w-3xl border border-border bg-white p-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h2 className="text-2xl font-bold">{t("doc.receipt")}</h2>
        <dl className="text-right">
          <dt className="sr-only">{t("receipt.number")}</dt>
          <dd className="text-lg font-bold">{receipt.receiptNumber}</dd>
          <dt className="sr-only">{t("receipt.date")}</dt>
          <dd>{receipt.receiptDate}</dd>
        </dl>
      </header>
      <p className="mt-6 text-sm font-semibold text-muted-foreground">{t("doc.to")}</p>
      <p className="font-bold">{receipt.customerName}</p>
      <p className="whitespace-pre-line">{receipt.customerAddress}</p>
      <p className="mt-6">
        {t("receipt.forInvoice")}: {receipt.invoiceNumber}
      </p>
      <p>
        {t("receipt.method")}: {t(`payment.methods.${methodKey(receipt.method)}`)}
      </p>
      <p className="mt-4 text-right text-xl font-bold">
        {t("receipt.received")}: {formatCurrency(receipt.amount, language)}
      </p>
      <p className="mt-2 text-right text-sm text-muted-foreground">{t("doc.noTax")}</p>
    </article>
  );
}

/** Download as a PDF file, and print, for one document of the page (`name` is its `data-print-doc`, `number` gives the file name). */
export function DocumentActions({ name, number }) {
  const { t } = useTranslation("invoices");
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      await downloadPdf(document.querySelector(`[data-print-doc="${name}"]`), `${number}.pdf`);
    } catch {
      toast.error(t("pdfFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" disabled={busy} onClick={download}>
        {busy ? t("makingPdf") : t("downloadPdf")}
      </Button>
      <Button type="button" variant="outline" onClick={() => printDocument(name, number)}>
        {t("print")}
      </Button>
    </div>
  );
}
