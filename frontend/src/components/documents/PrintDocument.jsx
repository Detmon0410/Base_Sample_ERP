import { useTranslation } from "react-i18next";

import { COMPANY } from "@/config/company";
import { formatCurrency, formatDate, formatNumber } from "@/utils/format";

/**
 * The paper version of a Sale document: A4, plain black on white, nothing that needs colour. DocumentSheet draws it
 * outside the app while the browser print dialog (Print / Save as PDF) is open; only this page is printed (see the
 * print rules in index.css). kind: "quotation" | "order" | "delivery". `record` is the document as the API sends it.
 */
export function PrintDocument({ kind, record }) {
  const { t, i18n } = useTranslation("sale");
  const language = i18n.language;
  const money = (value) => formatCurrency(value, language);
  const number = (value) => formatNumber(value, language);
  const isDelivery = kind === "delivery";

  const facts = [
    [t("print.date"), formatDate(record.date, language)],
    kind === "quotation" ? [t("print.validUntil"), formatDate(record.validUntil, language)] : null,
    kind === "order" ? [t("print.deliveryDate"), record.deliveryDate ? formatDate(record.deliveryDate, language) : "—"] : null,
    kind === "order" ? [t("print.customerPo"), record.customerPoNumber ?? "—"] : null,
    kind === "order" ? [t("print.quotation"), record.quotationNumber ?? "—"] : null,
    isDelivery ? [t("print.saleOrder"), record.saleOrderNumber ?? "—"] : null,
    isDelivery ? [t("print.warehouse"), record.warehouseName ?? "—"] : null,
    !isDelivery ? [t("print.salesPerson"), record.salesPersonName ?? "—"] : null,
  ].filter(Boolean);

  const cell = "border border-slate-400 px-2 py-1.5";

  return (
    <article className="print-page w-full bg-white text-[13px] leading-snug text-slate-900">
      <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
        <div>
          <p className="text-lg font-bold">{COMPANY.name}</p>
          <p>{COMPANY.address}</p>
          <p>
            {t("print.tel")} {COMPANY.phone} · {COMPANY.email}
          </p>
        </div>
        <div className="text-right">
          <h1 className="text-2xl font-bold tracking-wide">{t(`print.title.${kind}`)}</h1>
          <p className="mt-1 text-base font-semibold">{record.number}</p>
        </div>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs font-semibold text-slate-600">{t("print.to")}</p>
          <p className="mt-1 text-lg font-bold">{record.customerName}</p>
          <p className="text-slate-600">{record.customerCode}</p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {facts.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-slate-600">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <table className="mt-6 w-full border-collapse">
        <thead>
          <tr className="bg-slate-100 text-left">
            <th className={`${cell} w-10 text-center`}>{t("print.no")}</th>
            <th className={cell}>{t("print.product")}</th>
            {isDelivery ? (
              <>
                <th className={`${cell} w-28 text-right`}>{t("print.ordered")}</th>
                <th className={`${cell} w-32 text-right`}>{t("print.delivered")}</th>
              </>
            ) : (
              <>
                <th className={`${cell} w-24 text-right`}>{t("print.qty")}</th>
                <th className={`${cell} w-28 text-right`}>{t("print.unitPrice")}</th>
                <th className={`${cell} w-32 text-right`}>{t("print.amount")}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {record.lines.map((line, index) => (
            <tr key={line.productId} className="break-inside-avoid">
              <td className={`${cell} text-center`}>{index + 1}</td>
              <td className={cell}>
                <span className="font-semibold">{line.productCode}</span> · {line.productName}
              </td>
              {isDelivery ? (
                <>
                  <td className={`${cell} text-right`}>{number(line.ordered)}</td>
                  <td className={`${cell} text-right font-semibold`}>{number(line.deliverNow)}</td>
                </>
              ) : (
                <>
                  <td className={`${cell} text-right`}>
                    {number(line.qty)} {line.uom}
                  </td>
                  <td className={`${cell} text-right`}>{money(line.unitPrice)}</td>
                  <td className={`${cell} text-right`}>{money(line.amount)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {!isDelivery ? (
        <table className="mt-4 ml-auto w-72 border-collapse break-inside-avoid">
          <tbody>
            <tr>
              <td className={cell}>{t("print.subtotal")}</td>
              <td className={`${cell} text-right`}>{money(record.totals.subtotal)}</td>
            </tr>
            <tr>
              <td className={cell}>{t("print.tax", { rate: Math.round((record.totals.taxRate ?? 0.1) * 100) })}</td>
              <td className={`${cell} text-right`}>{money(record.totals.tax)}</td>
            </tr>
            <tr className="bg-slate-100 text-base font-bold">
              <td className={cell}>{t("print.total")}</td>
              <td className={`${cell} text-right`}>{money(record.totals.total)}</td>
            </tr>
          </tbody>
        </table>
      ) : null}

      {record.remarks ? (
        <section className="mt-6 break-inside-avoid">
          <p className="text-xs font-semibold text-slate-600">{t("print.remarks")}</p>
          <p className="mt-1 min-h-12 border border-slate-400 p-2 whitespace-pre-wrap">{record.remarks}</p>
        </section>
      ) : null}

      {isDelivery ? (
        <section className="mt-16 grid grid-cols-2 gap-10 break-inside-avoid">
          {[t("print.deliveredBy"), t("print.receivedBy")].map((label) => (
            <div key={label}>
              <div className="h-16 border-b border-slate-900" />
              <p className="mt-1 text-xs text-slate-600">{label}</p>
            </div>
          ))}
        </section>
      ) : null}
    </article>
  );
}
