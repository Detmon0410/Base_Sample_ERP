import { Download, Printer } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { HiddenPaper, Paper, PaperHeader, PaperNotes, PaperParties, PaperTable, PaperTotal, Signatures } from "@/components/documents/Paper";
import { formatCurrency, formatNumber } from "@/utils/format";
import { downloadPdf } from "@/utils/pdf";
import { printDocument } from "@/utils/print";

// The papers of the Accounting group: the invoice and the receipt, and the two buttons that save or print a paper.

/** The paper of the invoice (printed when `data-print-doc="invoice"` is the chosen document). */
export function InvoiceDocument({ invoice, language }) {
  const { t } = useTranslation(["invoices", "common"]);
  return (
    <HiddenPaper>
    <Paper name="invoice">
      <PaperHeader title={t("invoices:doc.invoice")} number={invoice.invoiceNumber} date={invoice.invoiceDate} />
      <PaperParties
        partyLabel={t("invoices:doc.billTo")}
        name={invoice.customerName}
        address={invoice.customerAddress}
        factsLabel={t("common:paper.details")}
        facts={[
          [t("invoices:date"), invoice.invoiceDate],
          [t("invoices:doc.orderRef"), invoice.orderNumber],
          [t("invoices:doc.status"), t(`invoices:status.${invoice.status}`)],
        ]}
      />
      <PaperTable
        rows={invoice.lines}
        rowKey={(_, index) => index}
        columns={[
          { key: "product", header: t("invoices:doc.product"), cell: (line) => `${line.productCode} ${line.productName}` },
          { key: "quantity", header: t("invoices:doc.quantity"), align: "right", cell: (line) => formatNumber(line.quantity, language) },
          { key: "unitPrice", header: t("invoices:doc.unitPrice"), align: "right", cell: (line) => formatCurrency(line.unitPrice, language) },
          { key: "amount", header: t("invoices:doc.amount"), align: "right", cell: (line) => formatCurrency(line.amount, language) },
        ]}
      />
      <PaperTotal text={`${t("invoices:doc.total")}: ${formatCurrency(invoice.total, language)}`} note={t("invoices:doc.noTax")} />
      <PaperNotes title={t("common:paper.terms")}>{t("invoices:doc.terms")}</PaperNotes>
      <Signatures labels={[t("invoices:doc.issuedBy"), t("invoices:doc.customerSign")]} />
    </Paper>
    </HiddenPaper>
  );
}

/** The paper of the receipt. */
export function ReceiptDocument({ receipt, language }) {
  const { t } = useTranslation(["invoices", "common"]);
  return (
    <HiddenPaper>
    <Paper name="receipt">
      <PaperHeader title={t("invoices:doc.receipt")} number={receipt.receiptNumber} date={receipt.receiptDate} />
      <PaperParties
        partyLabel={t("invoices:doc.receivedFrom")}
        name={receipt.customerName}
        address={receipt.customerAddress}
        factsLabel={t("common:paper.details")}
        facts={[
          [t("invoices:receipt.date"), receipt.receiptDate],
          [t("invoices:receipt.forInvoice"), receipt.invoiceNumber],
        ]}
      />
      <PaperTable
        rows={[receipt]}
        rowKey={() => "payment"}
        columns={[
          { key: "what", header: t("invoices:doc.description"), cell: () => `${t("invoices:doc.paymentOf")} ${receipt.invoiceNumber}` },
          { key: "amount", header: t("invoices:doc.amount"), align: "right", cell: () => formatCurrency(receipt.amount, language) },
        ]}
      />
      <PaperTotal text={`${t("invoices:receipt.received")}: ${formatCurrency(receipt.amount, language)}`} note={t("invoices:doc.noTax")} />
      <Signatures labels={[t("invoices:doc.receivedBy"), t("invoices:doc.customerSign")]} />
    </Paper>
    </HiddenPaper>
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
        <Download aria-hidden="true" />{busy ? t("makingPdf") : t("downloadPdf")}
      </Button>
      <Button type="button" variant="outline" onClick={() => printDocument(name, number)}>
        <Printer aria-hidden="true" />{t("print")}
      </Button>
    </div>
  );
}
