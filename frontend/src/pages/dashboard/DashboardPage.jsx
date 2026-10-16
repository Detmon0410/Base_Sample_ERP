import { Banknote, ChartColumn, CircleCheck, Factory, FilePlus2, ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { BarList } from "@/components/common/Charts";
import { Section } from "@/components/common/FormFields";
import { NumberTile as Tile } from "@/components/common/NumberTile";
import { PageHeader } from "@/components/common/PageHeader";
import { useLoad } from "@/hooks/useLoad";
import { getDashboard } from "@/services/dashboard.service";
import { formatCurrency, formatNumber } from "@/utils/format";

/**
 * The first page: number tiles (orders for everyone, invoices for an Admin) and, for an Admin, one chart of the orders by status,
 * all from one call. A tile links to the page that explains the number.
 */
export function DashboardPage() {
  const { t, i18n } = useTranslation(["dashboard", "nav", "common", "master"]);
  const { data, error, loading } = useLoad(getDashboard, []);
  const language = i18n.language;
  const number = (value) => formatNumber(value, language);
  const yen = (value) => formatCurrency(value, language);

  return (
    <>
      <PageHeader title={t("nav:dashboard")} />
      {error ? (
        <p role="alert" className="text-destructive">
          {t("dashboard:failed")}
        </p>
      ) : loading ? (
        <p role="status">{t("common:loading")}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="dash-tiles" className="flex flex-col gap-4">
            <h2 id="dash-tiles" className="sr-only">
              {t("dashboard:numbers")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile to="/sale/orders" icon={FilePlus2} tone="waiting" label={t("dashboard:draft")} value={number(data.orders.Draft)} />
              <Tile to="/sale/orders" icon={Factory} tone="progress" label={t("dashboard:inProgress")} value={number(data.orders.InProgress)} />
              <Tile to="/sale/orders" icon={CircleCheck} tone="done" label={t("dashboard:completed")} value={number(data.orders.Completed)} />
            </div>
            {data.invoicing ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Tile to="/accounting" icon={ReceiptText} tone="owed" label={t("dashboard:unpaidCount")} value={number(data.invoicing.unpaid.count)} />
                <Tile to="/accounting" icon={Banknote} tone="owed" label={t("dashboard:unpaidTotal")} value={yen(data.invoicing.unpaid.total)} />
                <Tile to="/accounting" icon={CircleCheck} tone="done" label={t("dashboard:paidThisMonth")} value={yen(data.invoicing.paidThisMonth.total)} />
              </div>
            ) : null}
          </section>

          {/* the chart is for an Admin (a Worker has none); it takes the whole width */}
          {data.invoicing ? (
            <Section icon={ChartColumn} title={t("dashboard:ordersChart")}>
              <BarList
                label={t("dashboard:ordersChart")}
                rows={[
                  { label: t("dashboard:draft"), value: data.orders.Draft, color: "bg-[#5b6772]" },
                  { label: t("dashboard:inProgress"), value: data.orders.InProgress, color: "bg-primary" },
                  { label: t("dashboard:completed"), value: data.orders.Completed, color: "bg-success" },
                ]}
                format={number}
              />
            </Section>
          ) : null}
        </div>
      )}
    </>
  );
}
