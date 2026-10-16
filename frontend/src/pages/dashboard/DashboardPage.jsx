import { Banknote, ChartColumn, CircleCheck, Factory, FilePlus2, ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { BarList } from "@/components/common/Charts";
import { Section } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { useLoad } from "@/hooks/useLoad";
import { getDashboard } from "@/services/dashboard.service";
import { formatCurrency, formatNumber } from "@/utils/format";

function Tile({ to, label, value, icon: Icon }) {
  return (
    <Link to={to} className="flex flex-col gap-1 rounded-md bg-primary p-5 text-primary-foreground hover:bg-[#006fa8]">
      <span className="flex items-center gap-2 text-sm">
        {Icon ? <Icon aria-hidden="true" className="size-5 shrink-0" /> : null}
        {label}
      </span>
      <span className="text-3xl font-bold">{value}</span>
    </Link>
  );
}

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
              <Tile to="/sale/orders" icon={FilePlus2} label={t("dashboard:draft")} value={number(data.orders.Draft)} />
              <Tile to="/sale/orders" icon={Factory} label={t("dashboard:inProgress")} value={number(data.orders.InProgress)} />
              <Tile to="/sale/orders" icon={CircleCheck} label={t("dashboard:completed")} value={number(data.orders.Completed)} />
            </div>
            {data.invoicing ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Tile to="/accounting" icon={ReceiptText} label={t("dashboard:unpaidCount")} value={number(data.invoicing.unpaid.count)} />
                <Tile to="/accounting" icon={Banknote} label={t("dashboard:unpaidTotal")} value={yen(data.invoicing.unpaid.total)} />
                <Tile to="/accounting" icon={CircleCheck} label={t("dashboard:paidThisMonth")} value={yen(data.invoicing.paidThisMonth.total)} />
              </div>
            ) : null}
          </section>

          {/* the chart is for an Admin (a Worker has none); it takes the whole width */}
          {data.invoicing ? (
            <Section icon={ChartColumn} title={t("dashboard:ordersChart")}>
              <BarList
                label={t("dashboard:ordersChart")}
                rows={[
                  { label: t("dashboard:draft"), value: data.orders.Draft },
                  { label: t("dashboard:inProgress"), value: data.orders.InProgress },
                  { label: t("dashboard:completed"), value: data.orders.Completed },
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
