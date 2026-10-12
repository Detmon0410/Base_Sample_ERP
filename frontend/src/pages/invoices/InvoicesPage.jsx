import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { RecordList } from "@/components/common/RecordList";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLoad } from "@/hooks/useLoad";
import { invoicesApi } from "@/services/invoices.service";
import { ordersApi } from "@/services/orders.service";
import { todayIso } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import { applyServerErrors } from "@/utils/serverErrors";

import { DocumentActions, InvoiceDocument, methodKey } from "./Documents";

const STATUSES = ["Unpaid", "Paid"];
const METHODS = ["Cash", "Bank transfer", "Cheque", "Credit card", "Other"];

/** A new invoice: choose a Completed order that has none, and the date. The invoice copies the order as it is now. */
function InvoiceNew() {
  const { t } = useTranslation(["invoices", "master", "common"]);
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState(null); // the values waiting for the confirmation
  const orders = useLoad(() => ordersApi.list({ status: "Completed", pageSize: 200 }), []);
  const form = useForm({ defaultValues: { orderId: "", invoiceDate: todayIso() } });
  const errors = form.formState.errors;

  const open = (orders.data?.items ?? []).filter((order) => !order.invoice);
  const options = [{ value: "", label: t("invoices:chooseOrder") }, ...open.map((order) => ({ value: String(order.id), label: `${order.orderNumber} ${order.customerName}` }))];

  const issue = async () => {
    const values = pending;
    setPending(null);
    setSummary(null);
    try {
      await invoicesApi.create(values);
      toast.success(t("invoices:issued"));
      navigate("/accounting/invoices");
    } catch (error) {
      setSummary(applyServerErrors(form, error, t));
    }
  };

  return (
    <>
      <PageHeader title={t("invoices:new")} />
      <form noValidate onSubmit={form.handleSubmit(setPending)} className="flex max-w-3xl flex-col gap-5">
        {summary ? (
          <Alert variant="destructive">
            <AlertDescription className="text-base">{summary}</AlertDescription>
          </Alert>
        ) : null}
        <Section title={t("invoices:section")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField label={t("invoices:order")} options={options} error={errors.orderId?.message} className="sm:col-span-2" {...form.register("orderId")} />
            {orders.data && open.length === 0 ? <p className="text-muted-foreground sm:col-span-2">{t("invoices:noOrders")}</p> : null}
            <TextField label={t("invoices:date")} placeholder="YYYY-MM-DD" inputMode="numeric" error={errors.invoiceDate?.message} {...form.register("invoiceDate")} />
            <p className="self-end pb-2 text-sm text-muted-foreground">{t("invoices:numberHint")}</p>
          </div>
        </Section>
        <div className="flex gap-3">
          <Button type="submit">{t("common:actions.save")}</Button>
          <Button asChild variant="outline">
            <Link to="/accounting/invoices">{t("common:actions.cancel")}</Link>
          </Button>
        </div>
      </form>
      <ConfirmDialog open={pending !== null} onOpenChange={(value) => !value && setPending(null)} title={t("invoices:issueTitle")} text={t("invoices:issueText")} onConfirm={issue} />
    </>
  );
}

/** The full payment of an unpaid invoice: date and amount only. It makes the invoice Paid and issues the receipt. */
function PaymentForm({ invoice, onDone }) {
  const { t, i18n } = useTranslation(["invoices", "common"]);
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState(null);
  const form = useForm({ defaultValues: { paymentDate: todayIso(), amount: "", method: "", reference: "" } });
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
          <SelectField
            label={t("invoices:payment.method")}
            options={[{ value: "", label: t("invoices:payment.chooseMethod") }, ...METHODS.map((value) => ({ value, label: t(`invoices:payment.methods.${methodKey(value)}`) }))]}
            error={errors.method?.message}
            {...form.register("method")}
          />
          <TextField label={t("invoices:payment.reference")} error={errors.reference?.message} {...form.register("reference")} />
          <p className="text-sm text-muted-foreground sm:col-span-2">{t("invoices:payment.hint", { total: formatCurrency(invoice.total, i18n.language) })}</p>
        </div>
        <div>
          <Button type="submit">{t("invoices:payment.record")}</Button>
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
      <PageHeader title={invoice.invoiceNumber} status={t(`invoices:status.${invoice.status}`)} />
      <div className="flex max-w-3xl flex-col gap-5">
        <div className="flex flex-wrap gap-3">
          <DocumentActions name="invoice" number={invoice.invoiceNumber} />
          <Button asChild variant="outline">
            <Link to="/accounting/invoices">{t("master:form.back")}</Link>
          </Button>
        </div>

        <InvoiceDocument invoice={invoice} language={language} />

        <Section title={t("invoices:payment.title")}>
          {invoice.payment ? (
            <p>
              {t("invoices:payment.paidOn", { date: invoice.payment.date, amount: formatCurrency(invoice.payment.amount, language), method: t(`invoices:payment.methods.${methodKey(invoice.payment.method)}`) })}
              {invoice.payment.reference ? ` - ${invoice.payment.reference}` : ""}
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

/** Invoices (Admin, the group Accounting): the list, a new invoice, one invoice with its payment. */
export function InvoicesPage() {
  const { t, i18n } = useTranslation(["invoices", "master"]);
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={invoicesApi}
            base="/accounting/invoices"
            title={t("title")}
            canCreate
            newLabel={t("new")}
            statusOptions={[{ value: "", label: t("master:list.all") }, ...STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))]}
            statusOf={(row) => t(`status.${row.status}`)}
            columns={[
              { key: "invoiceNumber", header: t("number") },
              { key: "invoiceDate", header: t("date") },
              { key: "customerName", header: t("customer") },
              { key: "orderNumber", header: t("order") },
              { key: "total", header: t("total"), cell: (row) => formatCurrency(row.total, i18n.language) },
            ]}
          />
        }
      />
      <Route path="new" element={<InvoiceNew />} />
      <Route path=":id" element={<InvoicePage />} />
    </Routes>
  );
}
