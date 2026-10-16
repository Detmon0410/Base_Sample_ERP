import { ArrowLeft, Banknote } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, Navigate, Route, Routes, useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Section, TextField } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLoad } from "@/hooks/useLoad";
import { invoicesApi } from "@/services/invoices.service";
import { todayIso } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import { applyServerErrors } from "@/utils/serverErrors";

import { DocumentActions, InvoiceDocument } from "./Documents";

/** The full payment of an unpaid invoice: date and amount only. It makes the invoice Paid and issues the receipt. */
function PaymentForm({ invoice, onDone }) {
  const { t, i18n } = useTranslation(["invoices", "common"]);
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState(null);
  const form = useForm({ defaultValues: { paymentDate: todayIso(), amount: "" } });
  const errors = form.formState.errors;

  const pay = async () => {
    const values = pending;
    setPending(null);
    setSummary(null);
    try {
      await invoicesApi.pay(invoice.id, values);
      toast.success(t("invoices:payment.done"));
      onDone();
    } catch (error) {
      setSummary(applyServerErrors(form, error, t));
    }
  };

  return (
    <>
      <p className="mb-4 text-muted-foreground">{t("invoices:payment.unpaid")}</p>
      <form noValidate onSubmit={form.handleSubmit(setPending)} className="flex flex-col gap-5">
        {summary ? (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{summary}</AlertDescription>
          </Alert>
        ) : null}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField label={t("invoices:payment.date")} placeholder="YYYY-MM-DD" inputMode="numeric" error={errors.paymentDate?.message} {...form.register("paymentDate")} />
          <TextField label={t("invoices:payment.amount")} type="number" min="0" step="1" error={errors.amount?.message} {...form.register("amount")} />
          <p className="text-sm text-muted-foreground sm:col-span-2">{t("invoices:payment.hint", { total: formatCurrency(invoice.total, i18n.language) })}</p>
        </div>
        <div>
          <Button type="submit"><Banknote aria-hidden="true" />{t("invoices:payment.record")}</Button>
        </div>
      </form>
      <ConfirmDialog open={pending !== null} onOpenChange={(value) => !value && setPending(null)} title={t("invoices:payment.confirmTitle")} text={t("invoices:payment.confirmText")} onConfirm={pay} />
    </>
  );
}

/** One invoice: the document, the payment (or the payment made) and a link to its receipt (the receipt has its own page, /receipts). The invoice can be downloaded as a PDF file or printed. */
function InvoicePage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation(["invoices", "master", "common"]);
  const { data: invoice, error, loading, reload } = useLoad(() => invoicesApi.get(id), [id]);
  const language = i18n.language;

  if (error) return <PageHeader title={t("master:form.notFound")} />;
  if (loading) return <PageHeader title={t("common:loading")} />;

  return (
    <>
      <PageHeader title={invoice.invoiceNumber} status={t(`invoices:status.${invoice.status}`)} statusTone={invoice.status === "Paid" ? "good" : "warn"} />
      <div className="flex max-w-3xl flex-col gap-5">
        <div className="flex flex-wrap gap-3">
          <DocumentActions name="invoice" number={invoice.invoiceNumber} />
          <Button asChild variant="outline">
            <Link to="/accounting"><ArrowLeft aria-hidden="true" />{t("master:form.back")}</Link>
          </Button>
        </div>

        <InvoiceDocument invoice={invoice} language={language} />

        <Section icon={Banknote} title={t("invoices:payment.title")}>
          {invoice.payment ? (
            <p>
              {t("invoices:payment.paidOn", { date: invoice.payment.date, amount: formatCurrency(invoice.payment.amount, language) })}
            </p>
          ) : (
            <PaymentForm invoice={invoice} onDone={reload} />
          )}
        </Section>

        {invoice.receipt ? (
          <p>
            {t("invoices:receipt.title")}: <Link to={`/accounting/receipts/${invoice.receipt.id}`}>{invoice.receipt.receiptNumber}</Link>
          </p>
        ) : null}
      </div>
    </>
  );
}

/** The invoice as a document (Admin): the paper, the payment and the link to its receipt. The list and "new invoice" are the Accounting work list. */
export function InvoicesPage() {
  return (
    <Routes>
      <Route index element={<Navigate to="/accounting" replace />} />
      <Route path="new" element={<Navigate to="/accounting" replace />} />
      <Route path=":id" element={<InvoicePage />} />
    </Routes>
  );
}
