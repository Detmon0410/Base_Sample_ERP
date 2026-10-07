import { TriangleAlertIcon, WalletIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ProgressBar } from "@/components/common/ProgressBar";
import { SheetSection } from "@/components/common/SheetSection";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { formatCurrency, formatDate } from "@/utils/format";

/** The amount of a line in yen, rounded like the server does. */
export const lineAmount = (line) => Math.round((Number(line?.qty) || 0) * (Number(line?.unitPrice) || 0));

/** Subtotal, tax (floor, at the chosen rate in %) and total of lines [{ qty, unitPrice }]. */
export function moneyTotals(lines, ratePercent) {
  const subtotal = (lines ?? []).reduce((sum, line) => sum + lineAmount(line), 0);
  const tax = Math.floor((subtotal * (ratePercent ?? 0)) / 100);
  return { subtotal, tax, total: subtotal + tax };
}

/** Subtotal / tax / total under the lines of an invoice or a bill; the tax rate is the one chosen for the document. */
export function MoneyTotals({ lines, ratePercent }) {
  const { t, i18n } = useTranslation("accounting");
  const { subtotal, tax, total } = moneyTotals(lines, ratePercent);
  const money = (value) => formatCurrency(value, i18n.language);
  return (
    <dl className="mt-4 ml-auto grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm" aria-label={t("lines.totals")}>
      <dt className="text-muted-foreground">{t("lines.subtotal")}</dt>
      <dd className="text-right">{money(subtotal)}</dd>
      <dt className="text-muted-foreground">{t("lines.tax", { percent: ratePercent ?? 0 })}</dt>
      <dd className="text-right">{money(tax)}</dd>
      <dt className="border-t pt-2 text-lg font-bold">{t("lines.total")}</dt>
      <dd className="border-t pt-2 text-right text-xl font-bold">{money(total)}</dd>
    </dl>
  );
}

/** What was paid against an invoice or a bill: a bar "paid of total", and the receipts / payments with their status. */
export function PaymentsCard({ doc, moneyPath, title, emptyText }) {
  const { t, i18n } = useTranslation("accounting");
  const language = i18n.language;
  const money = (value) => formatCurrency(value, language);
  return (
    <SheetSection title={title} icon={WalletIcon}>
      <ProgressBar value={doc.paid} max={doc.total} label={t("paid.paidOf", { paid: money(doc.paid), total: money(doc.total) })} tone={doc.balance === 0 ? "success" : doc.overdueDays > 0 ? "warning" : "primary"} />
      <p className="mt-1 flex flex-wrap justify-between gap-x-4 text-sm">
        <span className="font-semibold text-slate-700">{t("paid.paidOf", { paid: money(doc.paid), total: money(doc.total) })}</span>
        <span className={doc.balance > 0 ? "font-semibold text-amber-700" : "text-muted-foreground"}>{t("paid.balance", { balance: money(doc.balance) })}</span>
      </p>
      {doc.payments.length === 0 ? (
        <p className="mt-3 text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200/70">
          {doc.payments.map((payment) => (
            <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <Link to={`${moneyPath}/${payment.id}`} className="font-semibold text-primary underline-offset-2 hover:underline">
                {payment.number}
              </Link>
              <span className="text-muted-foreground">{formatDate(payment.date, language)}</span>
              <span className="font-semibold">{money(payment.amount)}</span>
              <DocumentStatusBadge status={payment.status} />
            </li>
          ))}
        </ul>
      )}
    </SheetSection>
  );
}

/** A warning line when the customer owes more than the credit limit (it never blocks anything). */
export function CreditWarning({ account }) {
  const { t, i18n } = useTranslation("accounting");
  if (!account?.overLimit) return null;
  return (
    <p role="status" className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 font-semibold text-warning">
      <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" />
      {t("invoices.overLimit", { owed: formatCurrency(account.openBalance, i18n.language), limit: formatCurrency(account.creditLimit, i18n.language) })}
    </p>
  );
}
