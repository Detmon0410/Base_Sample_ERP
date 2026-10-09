import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { useLoad } from "@/hooks/useLoad";
import { getSummary } from "@/services/summary.service";
import { formatCurrency, formatNumber } from "@/utils/format";

function Tile({ to, label, value, note }) {
  return (
    <Link to={to} className="flex flex-col gap-1 bg-primary p-5 text-primary-foreground hover:bg-[#6c6b9c]">
      <span className="text-sm">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
      {note ? <span className="text-sm">{note}</span> : null}
    </Link>
  );
}

/** The first page: the number of production orders by status and, for an Admin, the unpaid invoices. Numbers only. */
export function SummaryPage() {
  const { t, i18n } = useTranslation(["summary", "nav", "common"]);
  const { data, error, loading } = useLoad(getSummary, []);
  const language = i18n.language;

  return (
    <>
      <PageHeader title={t("nav:summary")} />
      {error ? (
        <p role="alert" className="text-destructive">
          {t("summary:failed")}
        </p>
      ) : loading ? (
        <p role="status">{t("common:loading")}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-labelledby="summary-orders">
            <h2 id="summary-orders" className="mb-3 bg-muted px-4 py-2 text-base font-bold">
              {t("summary:orders")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Tile to="/orders" label={t("summary:new")} value={formatNumber(data.orders.New, language)} />
              <Tile to="/orders" label={t("summary:inProgress")} value={formatNumber(data.orders.InProgress, language)} />
              <Tile to="/orders" label={t("summary:completed")} value={formatNumber(data.orders.Completed, language)} />
            </div>
          </section>
          {data.unpaidInvoices ? (
            <section aria-labelledby="summary-invoices">
              <h2 id="summary-invoices" className="mb-3 bg-muted px-4 py-2 text-base font-bold">
                {t("summary:invoices")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Tile to="/invoices" label={t("summary:unpaidCount")} value={formatNumber(data.unpaidInvoices.count, language)} />
                <Tile to="/invoices" label={t("summary:unpaidTotal")} value={formatCurrency(data.unpaidInvoices.total, language)} />
              </div>
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}
