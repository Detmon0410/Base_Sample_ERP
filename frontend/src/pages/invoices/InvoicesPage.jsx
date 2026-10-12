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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";
import { invoicesApi } from "@/services/invoices.service";
import { ordersApi } from "@/services/orders.service";
import { todayIso } from "@/utils/dates";
import { formatCurrency, formatNumber } from "@/utils/format";
import { downloadPdf } from "@/utils/pdf";
import { printDocument } from "@/utils/print";
import { applyServerErrors } from "@/utils/serverErrors";

const STATUSES = ["Unpaid", "Paid"];
const METHODS = ["Cash", "Bank transfer", "Cheque", "Credit card", "Other"];
const methodKey = (method) => String(method).split(" ").map((word) => word[0].toUpperCase() + word.slice(1)).join(""); // "Bank transfer" -> "BankTransfer", the key of its text

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
      navigate("/invoices");
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
            <Link to="/invoices">{t("common:actions.cancel")}</Link>
          </Button>
        </div>
      </form>
      <ConfirmDialog open={pending !== null} onOpenChange={(value) => !value && setPending(null)} title={t("invoices:issueTitle")} text={t("invoices:issueText")} onConfirm={issue} />
    </>
  );
}

/** The paper of the invoice (printed when `data-print-doc="invoice"` is the chosen document). */
function InvoiceDocument({ invoice, language }) {
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
function ReceiptDocument({ receipt, language }) {
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

/** Download as a PDF file, and print, for one document of the page (`name` is its `data-print-doc`, `number` gives the file name). */
function DocumentActions({ name, number }) {
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

/** One invoice: the document, the payment (or the payment made) and the receipt; each document can be downloaded as a PDF file or printed. */
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
            <Link to="/invoices">{t("master:form.back")}</Link>
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
          <>
            <DocumentActions name="receipt" number={invoice.receipt.receiptNumber} />
            <ReceiptDocument receipt={invoice.receipt} language={language} />
          </>
        ) : null}
      </div>
    </>
  );
}

/** Invoices (Admin): the list, a new invoice, one invoice with its payment and receipt. */
export function InvoicesPage() {
  const { t, i18n } = useTranslation(["invoices", "master"]);
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={invoicesApi}
            base="/invoices"
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
