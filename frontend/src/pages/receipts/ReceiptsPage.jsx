import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useParams } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { RecordList } from "@/components/common/RecordList";
import { Button } from "@/components/ui/button";
import { useLoad } from "@/hooks/useLoad";
import { receiptsApi } from "@/services/invoices.service";
import { formatCurrency } from "@/utils/format";
import { DocumentActions, ReceiptDocument } from "@/pages/invoices/Documents";

/** One receipt: the paper, the PDF and the print, and the link to its invoice. */
function ReceiptPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation(["invoices", "master", "common"]);
  const { data: receipt, error, loading } = useLoad(() => receiptsApi.get(id), [id]);

  if (error) return <PageHeader title={t("master:form.notFound")} />;
  if (loading) return <PageHeader title={t("common:loading")} />;

  return (
    <>
      <PageHeader title={receipt.receiptNumber} />
      <div className="flex max-w-3xl flex-col gap-5">
        <div className="flex flex-wrap gap-3">
          <DocumentActions name="receipt" number={receipt.receiptNumber} />
          <Button asChild variant="outline">
            <Link to="/accounting/receipts"><ArrowLeft aria-hidden="true" />{t("master:form.back")}</Link>
          </Button>
        </div>
        <ReceiptDocument receipt={receipt} language={i18n.language} />
        <p>
          {t("invoices:receipt.forInvoice")}: <Link to={`/accounting/invoices/${receipt.invoiceId}`}>{receipt.invoiceNumber}</Link>
        </p>
      </div>
    </>
  );
}

/**
 * Receipts (Admin, the group Accounting): the list of every receipt and one receipt. A receipt is made by the full payment of an invoice
 * (on the page of the invoice), so there is no "new receipt" here and nothing to edit or delete (docs/specs/s5-accounting-group.md).
 */
export function ReceiptsPage() {
  const { t, i18n } = useTranslation(["invoices", "master"]);
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={receiptsApi}
            base="/accounting/receipts"
            title={t("receiptsTitle")}
            canCreate={false}
            columns={[
              { key: "receiptNumber", header: t("receipt.number") },
              { key: "receiptDate", header: t("receipt.date") },
              { key: "customerName", header: t("customer") },
              { key: "invoiceNumber", header: t("receipt.forInvoice") },
              { key: "amount", header: t("doc.amount"), cell: (row) => formatCurrency(row.amount, i18n.language) },
            ]}
          />
        }
      />
      <Route path=":id" element={<ReceiptPage />} />
    </Routes>
  );
}
