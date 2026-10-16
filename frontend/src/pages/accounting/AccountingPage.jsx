import { Banknote, ReceiptText } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes } from "react-router";
import { toast } from "sonner";

import { FormDialog } from "@/components/common/FormDialog";
import { TextField } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard, StatRow } from "@/components/common/StatCard";
import { STATUS_ICONS } from "@/components/common/statusIcons";
import { StatusBadge } from "@/components/common/StatusBadge";
import { TabBar } from "@/components/common/TabBar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";
import { InvoicesPage } from "@/pages/invoices/InvoicesPage";
import { ReceiptsPage } from "@/pages/receipts/ReceiptsPage";
import { invoicesApi } from "@/services/invoices.service";
import { ordersApi } from "@/services/orders.service";
import { purchaseApi } from "@/services/purchase.service";
import { todayIso } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import { applyServerErrors } from "@/utils/serverErrors";

// Two sides: the money that comes in (customers pay us) and the money that goes out (we pay the suppliers). Each side has its own tabs.
const SIDES = { in: ["toInvoice", "unpaid", "paid"], out: ["toPay", "paidOut"] };

/** The invoice of a Completed order: the date, then the same call as ever (the invoice copies the order as it is now). */
function IssueDialog({ order, onClose, onDone }) {
  const { t } = useTranslation(["invoices", "common"]);
  const [summary, setSummary] = useState(null);
  const form = useForm({ defaultValues: { invoiceDate: todayIso() } });
  const submit = form.handleSubmit(async (values) => {
    setSummary(null);
    try {
      await invoicesApi.create({ orderId: order.id, invoiceDate: values.invoiceDate });
      toast.success(t("invoices:issued"));
      onDone();
    } catch (error) {
      setSummary(applyServerErrors(form, error, t));
    }
  });
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={t("invoices:issueTitle")}
      description={`${order.orderNumber} ${order.customerName}: ${t("invoices:issueText")}`}
      submitLabel={t("invoices:accounting.issue")}
      onSubmit={submit}
      submitting={form.formState.isSubmitting}
    >
      {summary ? (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{summary}</AlertDescription>
        </Alert>
      ) : null}
      <TextField label={t("invoices:date")} placeholder="YYYY-MM-DD" inputMode="numeric" error={form.formState.errors.invoiceDate?.message} {...form.register("invoiceDate")} />
    </FormDialog>
  );
}

/** The full payment of an unpaid invoice: the date and the amount (it starts as the total). */
function PayDialog({ invoice, onClose, onDone }) {
  const { t, i18n } = useTranslation(["invoices", "common"]);
  const [summary, setSummary] = useState(null);
  const form = useForm({ defaultValues: { paymentDate: todayIso(), amount: invoice.total } });
  const errors = form.formState.errors;
  const submit = form.handleSubmit(async (values) => {
    setSummary(null);
    try {
      await invoicesApi.pay(invoice.id, values);
      toast.success(t("invoices:payment.done"));
      onDone();
    } catch (error) {
      setSummary(applyServerErrors(form, error, t));
    }
  });
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onClose()}
      title={`${t("invoices:payment.title")}: ${invoice.invoiceNumber}`}
      description={t("invoices:payment.hint", { total: formatCurrency(invoice.total, i18n.language) })}
      submitLabel={t("invoices:accounting.pay")}
      onSubmit={submit}
      submitting={form.formState.isSubmitting}
    >
      {summary ? (
        <Alert variant="destructive">
          <AlertDescription className="text-base">{summary}</AlertDescription>
        </Alert>
      ) : null}
      <TextField label={t("invoices:payment.date")} placeholder="YYYY-MM-DD" inputMode="numeric" error={errors.paymentDate?.message} {...form.register("paymentDate")} />
      <TextField label={t("invoices:payment.amount")} type="number" min="0" step="1" error={errors.amount?.message} {...form.register("amount")} />
    </FormDialog>
  );
}

function Empty({ children }) {
  return <p className="rounded-md border border-border bg-card p-4 text-muted-foreground">{children}</p>;
}

/** The invoices of one tab: unpaid ones have Record payment, paid ones open their receipt. */
function InvoiceTable({ rows, language, paid, empty, onPay }) {
  const { t } = useTranslation("invoices");
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <Table data-stack>
      <TableHeader>
        <TableRow>
          <TableHead>{t("number")}</TableHead>
          <TableHead>{t("date")}</TableHead>
          <TableHead>{t("customer")}</TableHead>
          <TableHead className="text-right">{t("total")}</TableHead>
          <TableHead>{t("accounting.statusColumn")}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell data-label={t("number")}>
              <Link to={`/accounting/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link>
            </TableCell>
            <TableCell data-label={t("date")}>{invoice.invoiceDate}</TableCell>
            <TableCell data-label={t("customer")}>{invoice.customerName}</TableCell>
            <TableCell data-label={t("total")} className="text-right font-bold tabular-nums">
              {formatCurrency(invoice.total, language)}
            </TableCell>
            <TableCell data-label={t("accounting.statusColumn")}>
              <StatusBadge tone={paid ? "good" : "warn"}>{t(`status.${invoice.status}`)}</StatusBadge>
            </TableCell>
            <TableCell>
              {paid ? (
                invoice.receipt ? (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/accounting/receipts/${invoice.receipt.id}`}>
                      <ReceiptText aria-hidden="true" />
                      {t("accounting.openReceipt")}: {invoice.receipt.receiptNumber}
                    </Link>
                  </Button>
                ) : null
              ) : (
                <Button type="button" size="sm" aria-label={`${t("accounting.pay")}: ${invoice.invoiceNumber}`} onClick={() => onPay(invoice)}>
                  <Banknote aria-hidden="true" />
                  {t("accounting.pay")}
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/** The purchase orders of one tab: the ones to pay open the PO page, where the payment (method, reference) is recorded; the paid ones show the payment. */
function PurchaseTable({ rows, language, paid, empty }) {
  const { t } = useTranslation(["invoices", "purchase"]);
  if (rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <Table data-stack>
      <TableHeader>
        <TableRow>
          <TableHead>{t("purchase:poNumber")}</TableHead>
          <TableHead>{t("purchase:supplier")}</TableHead>
          <TableHead>{paid ? t("invoices:accounting.paidOn") : t("invoices:accounting.requiredDate")}</TableHead>
          <TableHead className="text-right">{t("purchase:lines.total")}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((po) => (
          <TableRow key={po.id}>
            <TableCell data-label={t("purchase:poNumber")}>
              <Link to={`/purchase/orders/${po.id}`}>{po.poNumber}</Link>
            </TableCell>
            <TableCell data-label={t("purchase:supplier")}>{po.supplierName}</TableCell>
            <TableCell data-label={paid ? t("invoices:accounting.paidOn") : t("invoices:accounting.requiredDate")}>{paid ? po.payment?.paymentDate : po.requiredDate}</TableCell>
            <TableCell data-label={t("purchase:lines.total")} className="text-right font-bold tabular-nums">
              {formatCurrency(po.total, language)}
            </TableCell>
            <TableCell>
              {paid ? (
                <StatusBadge tone="good">{t("invoices:status.Paid")}</StatusBadge>
              ) : (
                <Button asChild size="sm">
                  <Link to={`/purchase/orders/${po.id}`} aria-label={`${t("invoices:accounting.payPo")}: ${po.poNumber}`}>
                    <Banknote aria-hidden="true" />
                    {t("invoices:accounting.payPo")}
                  </Link>
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Accounting on one page (Admin): the orders to invoice, the invoices waiting for payment and the invoices that are paid, each row with the
 * one thing to do next. The invoice and the receipt keep their own pages as documents (print, PDF). Same calls and same rules as before.
 */
function AccountingWork() {
  const { t, i18n } = useTranslation(["invoices", "nav", "master", "common", "purchase"]);
  const [side, setSide] = useState("in"); // "in": customers pay us, "out": we pay the suppliers
  const [tabs, setTabs] = useState({ in: "toInvoice", out: "toPay" }); // the tab that is open on each side
  const [issuing, setIssuing] = useState(null); // the order being invoiced
  const [paying, setPaying] = useState(null); // the invoice being paid
  const { data, error, reload } = useLoad(async () => {
    const [toInvoice, unpaid, paid, toPay, paidOut] = await Promise.all([
      ordersApi.list({ status: "Completed", invoiced: "false", pageSize: 200 }),
      invoicesApi.list({ status: "Unpaid", pageSize: 200 }),
      invoicesApi.list({ status: "Paid", pageSize: 200 }),
      purchaseApi.list({ status: "Received", paid: "false", pageSize: 200 }),
      purchaseApi.list({ status: "Received", paid: "true", pageSize: 200 }),
    ]);
    return {
      toInvoice: toInvoice.items,
      unpaid: [...unpaid.items].sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate) || a.id - b.id), // oldest first
      paid: paid.items,
      toPay: [...toPay.items].sort((a, b) => a.requiredDate.localeCompare(b.requiredDate) || a.id - b.id), // the one needed first
      paidOut: paidOut.items,
    };
  }, []);
  const language = i18n.language;
  const done = () => {
    setIssuing(null);
    setPaying(null);
    reload();
  };

  const unpaidTotal = (data?.unpaid ?? []).reduce((sum, invoice) => sum + invoice.total, 0);
  const toPayTotal = (data?.toPay ?? []).reduce((sum, po) => sum + po.total, 0);
  const tab = tabs[side];
  const tabList = SIDES[side].map((key) => ({ key, label: t(`invoices:accounting.tabs.${key}`), icon: STATUS_ICONS[key], count: data ? data[key].length : null }));

  return (
    <>
      <PageHeader title={t("nav:accounting")} />
      {error ? (
        <p role="alert" className="text-destructive">
          {t("invoices:accounting.failed")}
        </p>
      ) : !data ? (
        <p role="status">{t("common:loading")}</p>
      ) : (
        <div className="flex max-w-5xl flex-col gap-5">
          <StatRow>
            <StatCard label={t("invoices:accounting.toInvoiceCount")} value={data.toInvoice.length} tone={data.toInvoice.length > 0 ? "warn" : undefined} />
            <StatCard label={t("invoices:accounting.unpaidTotal")} value={formatCurrency(unpaidTotal, language)} tone={unpaidTotal > 0 ? "warn" : undefined} />
            <StatCard label={t("invoices:accounting.toPayTotal")} value={formatCurrency(toPayTotal, language)} tone={toPayTotal > 0 ? "warn" : undefined} />
          </StatRow>
          <div role="group" aria-label={t("invoices:accounting.sideLabel")} className="flex w-fit gap-1 rounded-md bg-[#eceef1] p-1">
            {["in", "out"].map((key) => (
              <Button key={key} type="button" size="sm" variant={side === key ? "default" : "ghost"} aria-pressed={side === key} onClick={() => setSide(key)}>
                {t(`invoices:accounting.sides.${key}`)}
              </Button>
            ))}
          </div>
          <TabBar label={t("invoices:accounting.tabsLabel")} tabs={tabList} value={tab} onChange={(key) => setTabs((old) => ({ ...old, [side]: key }))} />

          {tab === "toInvoice" ? (
            data.toInvoice.length === 0 ? (
              <Empty>{t("invoices:accounting.empty.toInvoice")}</Empty>
            ) : (
              <Table data-stack>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("invoices:order")}</TableHead>
                    <TableHead>{t("invoices:customer")}</TableHead>
                    <TableHead>{t("invoices:accounting.orderDate")}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.toInvoice.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell data-label={t("invoices:order")}>
                        <Link to={`/sale/orders/${order.id}`}>{order.orderNumber}</Link>
                      </TableCell>
                      <TableCell data-label={t("invoices:customer")}>{order.customerName}</TableCell>
                      <TableCell data-label={t("invoices:accounting.orderDate")}>{order.orderDate}</TableCell>
                      <TableCell>
                        <Button type="button" size="sm" aria-label={`${t("invoices:accounting.issue")}: ${order.orderNumber}`} onClick={() => setIssuing(order)}>
                          <ReceiptText aria-hidden="true" />
                          {t("invoices:accounting.issue")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : tab === "toPay" || tab === "paidOut" ? (
            <PurchaseTable rows={data[tab]} language={language} paid={tab === "paidOut"} empty={t(`invoices:accounting.empty.${tab}`)} />
          ) : (
            <InvoiceTable rows={data[tab]} language={language} paid={tab === "paid"} empty={t(`invoices:accounting.empty.${tab}`)} onPay={setPaying} />
          )}
        </div>
      )}
      {issuing ? <IssueDialog order={issuing} onClose={() => setIssuing(null)} onDone={done} /> : null}
      {paying ? <PayDialog invoice={paying} onClose={() => setPaying(null)} onDone={done} /> : null}
    </>
  );
}

/** Accounting (Admin): the work list, and the invoice and the receipt as documents. The old lists and `new` open the work list. */
export function AccountingPage() {
  return (
    <Routes>
      <Route index element={<AccountingWork />} />
      <Route path="invoices/*" element={<InvoicesPage />} />
      <Route path="receipts/*" element={<ReceiptsPage />} />
    </Routes>
  );
}
