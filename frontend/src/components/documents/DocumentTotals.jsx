import { useTranslation } from "react-i18next";

import { documentTotals, TAX_RATE } from "@/config/sale";
import { formatCurrency } from "@/utils/format";

export function DocumentTotals({ lines }) {
  const { t, i18n } = useTranslation("sale");
  const { subtotal, tax, total } = documentTotals(lines);
  const money = (value) => formatCurrency(value, i18n.language);

  return (
    <dl className="ml-auto mt-4 grid w-full max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm" aria-label={t("lines.totals")}>
      <dt className="text-muted-foreground">{t("lines.subtotal")}</dt>
      <dd className="text-right">{money(subtotal)}</dd>
      <dt className="text-muted-foreground">{t("lines.tax", { percent: Math.round(TAX_RATE * 100) })}</dt>
      <dd className="text-right">{money(tax)}</dd>
      <dt className="border-t pt-2 text-lg font-bold">{t("lines.total")}</dt>
      <dd className="border-t pt-2 text-right text-xl font-bold">{money(total)}</dd>
    </dl>
  );
}
