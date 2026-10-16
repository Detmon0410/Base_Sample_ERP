import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, Route, Routes, useParams } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useLoad } from "@/hooks/useLoad";
import { receiptsApi } from "@/services/invoices.service";
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
            <Link to="/accounting"><ArrowLeft aria-hidden="true" />{t("master:form.back")}</Link>
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

/** A receipt as a document (Admin). A receipt is made by the full payment of an invoice; the list of them is the Paid tab of the Accounting work list. */
export function ReceiptsPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="/accounting" replace />} />
      <Route path=":id" element={<ReceiptPage />} />
    </Routes>
  );
}
