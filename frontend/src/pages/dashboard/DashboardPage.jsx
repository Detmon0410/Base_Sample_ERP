import { Banknote, ChartColumn, CircleCheck, Factory, FilePlus2, ReceiptText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { BarList } from "@/components/common/Charts";
import { Section } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { useLoad } from "@/hooks/useLoad";
import { getDashboard } from "@/services/dashboard.service";
import { formatCurrency, formatNumber } from "@/utils/format";

// The colour of a tile says what the number is: grey = waiting, blue = going on, green = done, teal = money received, red = money still to come in.
// Each class is written out in full so that Tailwind finds it; the text is white on all of them (5:1 or better, 4:1 for the blue).
const TILE_TONES = {
  waiting: "bg-[#5b6772] hover:bg-[#49535c]",
  progress: "bg-primary hover:bg-[#006fa8]",
  done: "bg-success hover:bg-[#155a31]",
  owed: "bg-[#dc2626] hover:bg-[#b91c1c]",
  paid: "bg-[#0f766e] hover:bg-[#115e59]",
};

function Tile({ to, label, value, icon: Icon, tone = "progress" }) {
  return (
    <Link to={to} className={`flex flex-col gap-1 rounded-md p-5 text-primary-foreground ${TILE_TONES[tone]}`}>
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
              <Tile to="/sale/orders" icon={FilePlus2} tone="waiting" label={t("dashboard:draft")} value={number(data.orders.Draft)} />
              <Tile to="/sale/orders" icon={Factory} tone="progress" label={t("dashboard:inProgress")} value={number(data.orders.InProgress)} />
              <Tile to="/sale/orders" icon={CircleCheck} tone="done" label={t("dashboard:completed")} value={number(data.orders.Completed)} />
            </div>
            {data.invoicing ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Tile to="/accounting" icon={ReceiptText} tone="owed" label={t("dashboard:unpaidCount")} value={number(data.invoicing.unpaid.count)} />
                <Tile to="/accounting" icon={Banknote} tone="owed" label={t("dashboard:unpaidTotal")} value={yen(data.invoicing.unpaid.total)} />
                <Tile to="/accounting" icon={CircleCheck} tone="paid" label={t("dashboard:paidThisMonth")} value={yen(data.invoicing.paidThisMonth.total)} />
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
