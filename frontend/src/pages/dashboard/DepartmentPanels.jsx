import { useTranslation } from "react-i18next";

import { useAuth } from "@/hooks/useAuth";
import { canUse } from "@/utils/permissions";
import { formatCompact, formatCurrency, formatDate, formatNumber } from "@/utils/format";

import { BlockCard } from "./BlockCard";
import { ProductionBlock } from "./Blocks";
import { KpiCard } from "./KpiCard";
import { BarChart, BarList } from "./charts";

function Kpis({ children }) {
  return <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</section>;
}

function useFormats() {
  const { t, i18n } = useTranslation("dashboard");
  const language = i18n.language;
  return {
    t,
    language,
    money: (value) => formatCurrency(value, language),
    number: (value) => formatNumber(value, language),
    compactMoney: (value) => `¥${formatCompact(value, language)}`,
    compact: (value) => formatCompact(value, language),
    month: (value) => new Intl.DateTimeFormat(language, { month: "short" }).format(new Date(`${value}-01T00:00:00Z`)),
    week: (value) => new Intl.DateTimeFormat(language, { month: "numeric", day: "numeric" }).format(new Date(`${value}T00:00:00Z`)),
  };
}

function Panel({ title, loading, hasError, onRetry, empty, emptyText, children }) {
  const status = loading ? "loading" : hasError ? "error" : empty ? "empty" : "ready";
  return (
    <BlockCard title={title} status={status} emptyText={emptyText} onRetry={onRetry}>
      {children}
    </BlockCard>
  );
}

function SalePanel({ data, loading, hasError, onRetry }) {
  const { t, money, number, compactMoney, month } = useFormats();
  const { t: tSale } = useTranslation("sale");
  const { user } = useAuth();
  const link = canUse(user, { type: "departments", departments: ["Sale"] });
  return (
    <>
      <Kpis>
        <KpiCard department="Sale" label={t("sale.openOrders")} value={number(data?.openOrders ?? 0)} context={t("sale.openOrdersContext", { count: number(data?.readyToDeliver ?? 0) })} to="/sale/orders" canLink={link} />
        <KpiCard department="Sale" label={t("sale.quotationsWaiting")} value={number(data?.quotationsWaiting ?? 0)} context={t("sale.quotationsContext", { count: data?.oldestQuotationDays ?? 0 })} to="/sale/quotations" canLink={link} />
        <KpiCard department="Sale" label={t("sale.readyToDeliver")} value={number(data?.readyToDeliver ?? 0)} context={t("sale.readyContext")} to="/sale/orders" canLink={link} />
        <KpiCard department="Sale" label={t("sale.salesThisMonth")} value={money(data?.salesThisMonth ?? 0)} context={t("sale.salesContext")} to="/sale/orders" canLink={link} />
      </Kpis>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={t("sale.monthlyTitle")} loading={loading} hasError={hasError} onRetry={onRetry}>
          <BarChart
            data={(data?.monthlySales ?? []).map((row) => ({ label: month(row.month), values: [row.value] }))}
            series={[{ name: t("sale.monthlySeries"), className: "bg-primary" }]}
            format={money}
            compact={compactMoney}
            ariaLabel={t("sale.monthlyTitle")}
            emptyText={t("noData")}
          />
        </Panel>
        <Panel title={t("sale.statusTitle")} loading={loading} hasError={hasError} onRetry={onRetry}>
          <BarList rows={(data?.orderStatus ?? []).map((row) => ({ key: row.status, label: tSale(`status.${row.status}`), value: row.count }))} emptyText={t("noData")} />
        </Panel>
      </div>
    </>
  );
}

function FactoryPanel({ data, loading, hasError, onRetry }) {
  const { t, number, compact, week } = useFormats();
  const { user } = useAuth();
  const link = canUse(user, { type: "departments", departments: ["Factory"] });
  return (
    <>
      <Kpis>
        <KpiCard department="Factory" label={t("factory.inProcess")} value={number(data?.inProcess ?? 0)} context={t("factory.inProcessContext", { count: number(data?.scheduled ?? 0) })} to="/factory/work-orders" canLink={link} />
        <KpiCard department="Factory" label={t("factory.late")} value={number(data?.late ?? 0)} context={t("factory.lateContext")} problem={(data?.late ?? 0) > 0} to="/factory/work-orders" canLink={link} />
        <KpiCard department="Factory" label={t("factory.producedThisWeek")} value={number(data?.producedThisWeek ?? 0)} context={t("factory.producedContext")} to="/factory/tracking" canLink={link} />
        <KpiCard department="Factory" label={t("factory.toTransfer")} value={number(data?.toTransfer ?? 0)} context={t("factory.toTransferContext")} to="/factory/transfers" canLink={link} />
      </Kpis>
      <div className="grid gap-5 xl:grid-cols-2">
        <ProductionBlock items={data?.running} loading={loading} hasError={hasError} onRetry={onRetry} />
        <Panel title={t("factory.weeklyTitle")} loading={loading} hasError={hasError} onRetry={onRetry}>
          <BarChart
            data={(data?.weeklyProduced ?? []).map((row) => ({ label: week(row.week), values: [row.value] }))}
            series={[{ name: t("factory.weeklySeries"), className: "bg-teal-700" }]}
            format={number}
            compact={compact}
            ariaLabel={t("factory.weeklyTitle")}
            emptyText={t("noData")}
          />
        </Panel>
      </div>
    </>
  );
}

function PurchasePanel({ data, loading, hasError, onRetry }) {
  const { t, number, language } = useFormats();
  const { user } = useAuth();
  const link = canUse(user, { type: "departments", departments: ["Purchase"] });
  const levels = (data?.stockLevels ?? []).map((row) => ({
    key: row.materialId,
    label: `${row.name} (${row.code})`,
    value: row.reorderPoint > 0 ? Math.min(150, Math.round((row.onHand / row.reorderPoint) * 100)) : 0,
    text: `${formatNumber(row.onHand, language)} / ${formatNumber(row.reorderPoint, language)} ${row.uom}`,
    className: row.status === "SHORTAGE" ? "bg-red-600" : "bg-amber-500",
  }));
  return (
    <>
      <Kpis>
        <KpiCard department="Purchase" label={t("purchase.shortage")} value={number(data?.shortage ?? 0)} context={t("purchase.shortageContext", { count: number(data?.nearShortage ?? 0) })} problem={(data?.shortage ?? 0) > 0} to="/purchase/stock-status" canLink={link} />
        <KpiCard department="Purchase" label={t("purchase.poWaiting")} value={number(data?.poWaitingForGoods ?? 0)} context={data?.nextDueDate ? t("purchase.poWaitingContext", { date: formatDate(data.nextDueDate, language) }) : t("purchase.noDueDate")} to="/purchase/orders" canLink={link} />
        <KpiCard department="Purchase" label={t("purchase.poToApprove")} value={number(data?.poToApprove ?? 0)} context={t("purchase.poToApproveContext")} to="/purchase/orders" canLink={link} />
        <KpiCard department="Purchase" label={t("purchase.nearShortage")} value={number(data?.nearShortage ?? 0)} context={t("purchase.nearContext")} to="/purchase/stock-status" canLink={link} />
      </Kpis>
      <Panel title={t("purchase.levelsTitle")} loading={loading} hasError={hasError} onRetry={onRetry} empty={levels.length === 0} emptyText={t("purchase.levelsEmpty")}>
        <p className="m-0 mb-3 text-sm text-muted-foreground">{t("purchase.levelsHint")}</p>
        <BarList rows={levels} emptyText={t("purchase.levelsEmpty")} />
      </Panel>
    </>
  );
}

function AccountingPanel({ data, loading, hasError, onRetry }) {
  const { t, number, money, compactMoney, month } = useFormats();
  const { user } = useAuth();
  const link = canUse(user, { type: "departments", departments: ["Accounting"] });
  return (
    <>
      <Kpis>
        <KpiCard department="Accounting" label={t("accounting.overdueAmount")} value={money(data?.overdueAmount ?? 0)} context={t("accounting.overdueContext", { count: data?.overdueCount ?? 0 })} problem={(data?.overdueCount ?? 0) > 0} to="/accounting/invoices" canLink={link} />
        <KpiCard department="Accounting" label={t("accounting.overdueCount")} value={number(data?.overdueCount ?? 0)} context={t("accounting.overdueCountContext")} problem={(data?.overdueCount ?? 0) > 0} to="/accounting/invoices" canLink={link} />
        <KpiCard department="Accounting" label={t("accounting.billsDue")} value={money(data?.billsDueIn7Days ?? 0)} context={t("accounting.billsDueContext")} to="/accounting/bills" canLink={link} />
        <KpiCard department="Accounting" label={t("accounting.receivedThisMonth")} value={money(data?.receivedThisMonth ?? 0)} context={t("accounting.receivedContext")} to="/accounting/receipts" canLink={link} />
      </Kpis>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title={t("accounting.cashTitle")} loading={loading} hasError={hasError} onRetry={onRetry}>
          <BarChart
            data={(data?.cashFlow ?? []).map((row) => ({ label: month(row.month), values: [row.in, row.out] }))}
            series={[
              { name: t("accounting.cashIn"), className: "bg-primary" },
              { name: t("accounting.cashOut"), className: "bg-slate-400" },
            ]}
            format={money}
            compact={compactMoney}
            ariaLabel={t("accounting.cashTitle")}
            emptyText={t("noData")}
          />
        </Panel>
        <Panel title={t("accounting.agingTitle")} loading={loading} hasError={hasError} onRetry={onRetry}>
          <BarList
            rows={(data?.receivableAging ?? []).map((row) => ({ key: row.bucket, label: t(`accounting.aging.${row.bucket}`), value: row.amount, text: money(row.amount), className: row.bucket === "notDue" ? "bg-primary" : row.bucket === "late30" ? "bg-amber-500" : "bg-red-600" }))}
            emptyText={t("noData")}
          />
        </Panel>
      </div>
    </>
  );
}

const PANELS = { Sale: SalePanel, Factory: FactoryPanel, Purchase: PurchasePanel, Accounting: AccountingPanel };
const KEYS = { Sale: "sale", Factory: "factory", Purchase: "purchase", Accounting: "accounting" };

/** The page of one department: the numbers and the charts. */
export function DepartmentPanel({ department, departments, loading, hasError, onRetry }) {
  const Content = PANELS[department];
  return (
    <div className="flex flex-col gap-5">
      <Content data={departments?.[KEYS[department]]} loading={loading} hasError={hasError} onRetry={onRetry} />
    </div>
  );
}
