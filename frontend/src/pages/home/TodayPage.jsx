import { AlertTriangle, PackageCheck, Pencil, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { ProgressForm } from "@/pages/orders/OrderView";
import { useStartProduction } from "@/pages/orders/StartProduction";
import { materialsApi } from "@/services/master.service";
import { ordersApi } from "@/services/orders.service";
import { purchaseApi } from "@/services/purchase.service";
import { formatNumber } from "@/utils/format";
import { can } from "@/utils/permissions";

const BIG = "h-12 px-5 text-base"; // a big button: it is pressed with a thumb on a tablet

function Group({ title, count, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-3 text-lg font-bold">
        {title}
        <span className="min-w-7 bg-[#eceef1] px-2 text-center text-sm font-bold tabular-nums">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function Bar({ value, max, label }) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} className="h-2 w-full bg-[#eceef1]">
      <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
  );
}

/** An order that is ready: what it is for, and one big button to start it (the start deducts the stock; a short material is listed with the way to add it). */
function StartCard({ order, onChanged }) {
  const { t, i18n } = useTranslation(["dashboard", "orders"]);
  const starter = useStartProduction(order, onChanged);
  const processes = order.lines.reduce((sum, line) => sum + line.processes.length, 0);
  return (
    <article className="flex flex-col gap-3 border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <Link to={`/sale/orders/${order.id}`} className="text-lg font-bold">
          {order.orderNumber}
        </Link>
        <span className="text-muted-foreground">{order.customerName}</span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {order.lines.map((line) => (
          <li key={line.id}>
            {line.productCode} {line.productName}: <b className="tabular-nums">{formatNumber(line.quantity, i18n.language)}</b>
          </li>
        ))}
      </ul>
      {processes === 0 ? <p className="text-sm text-warning">{t("dashboard:today.noProcesses")}</p> : null}
      {starter.alert}
      <div className="[&_button]:h-12 [&_button]:px-5 [&_button]:text-base">{starter.button}</div>
      {starter.dialog}
    </article>
  );
}

/** An order in production: every process with its bar, and a big button to record progress of the one that is next. */
function RunningCard({ order, onChanged }) {
  const { t, i18n } = useTranslation(["dashboard", "orders"]);
  const { user } = useAuth();
  const [editing, setEditing] = useState(null); // { lineId, processId }
  const mayRecord = can(user, "orders.progress");
  const done = () => {
    setEditing(null);
    onChanged();
  };
  return (
    <article className="flex flex-col gap-4 border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <Link to={`/sale/orders/${order.id}`} className="text-lg font-bold">
          {order.orderNumber}
        </Link>
        <span className="text-muted-foreground">{order.customerName}</span>
      </div>
      {order.lines.map((line) => {
        const next = line.processes.find((process) => process.status !== "Completed");
        return (
          <div key={line.id} className="flex flex-col gap-2">
            <p className="font-semibold">
              {line.productCode} {line.productName} <span className="font-normal text-muted-foreground">x {formatNumber(line.quantity, i18n.language)}</span>
            </p>
            <ol className="m-0 flex list-none flex-col gap-2 p-0">
              {line.processes.map((process) => (
                <li key={process.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[12rem_1fr_auto]">
                  <span className={process.id === next?.id ? "font-bold" : undefined}>
                    {process.sequence}. {process.name}
                  </span>
                  <span className="order-last col-span-2 sm:order-none sm:col-span-1">
                    <Bar value={process.completedQuantity} max={line.quantity} label={`${process.name}: ${process.completedQuantity} / ${line.quantity}`} />
                  </span>
                  <span className="text-sm tabular-nums">
                    {formatNumber(process.completedQuantity, i18n.language)} / {formatNumber(line.quantity, i18n.language)}
                  </span>
                </li>
              ))}
            </ol>
            {next && mayRecord ? (
              <div>
                <Button type="button" className={BIG} onClick={() => setEditing({ lineId: line.id, processId: next.id })} aria-label={`${t("dashboard:today.record")}: ${order.orderNumber} ${line.productCode} ${next.name}`}>
                  <Pencil aria-hidden="true" />
                  {t("dashboard:today.record")}: {next.name}
                </Button>
              </div>
            ) : null}
            {editing?.lineId === line.id ? (
              <ProgressForm key={editing.processId} order={order} line={line} process={line.processes.find((process) => process.id === editing.processId)} onDone={done} onCancel={() => setEditing(null)} />
            ) : null}
          </div>
        );
      })}
    </article>
  );
}

/**
 * The first page of a Factory Worker: what to do today. Orders waiting to start (one big button), orders in production (the next process
 * and a big button to record progress), the purchase orders that were sent and wait to be received, and a strip for the materials that are low.
 * It only reads the lists the pages already use and calls the same actions; the detail pages are one click away.
 */
export function TodayPage() {
  const { t, i18n } = useTranslation(["dashboard", "nav", "common", "orders", "purchase"]);
  const { user } = useAuth();
  const { data, error, reload } = useLoad(async () => {
    const [orders, materials, purchases] = await Promise.all([
      ordersApi.list({ pageSize: 200 }),
      materialsApi.list({ pageSize: 200 }),
      can(user, "purchase.use") ? purchaseApi.list({ status: "Sent", pageSize: 50 }) : Promise.resolve({ items: [] }),
    ]);
    const open = await Promise.all(orders.items.filter((order) => order.status !== "Completed").slice(0, 20).map((order) => ordersApi.get(order.id)));
    return {
      toStart: open.filter((order) => !order.started),
      running: open.filter((order) => order.started),
      low: materials.items.filter((material) => material.stockStatus === "Low" || material.stockStatus === "Out"),
      toReceive: purchases.items,
    };
  }, []);

  return (
    <>
      <PageHeader title={t("nav:today")} />
      {error ? (
        <p role="alert" className="text-destructive">
          {t("dashboard:today.failed")}
        </p>
      ) : !data ? (
        <p role="status">{t("common:loading")}</p>
      ) : (
        <div className="flex max-w-5xl flex-col gap-8">
          {data.low.length > 0 ? (
            <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-border bg-[#fbefd2] p-3">
              <AlertTriangle aria-hidden="true" className="size-5 shrink-0 text-warning" />
              <span className="font-semibold">{t("dashboard:today.low", { count: data.low.length })}</span>
              <span className="text-sm">{data.low.slice(0, 4).map((material) => `${material.code} (${formatNumber(material.total, i18n.language)} ${material.unit})`).join(", ")}</span>
              {can(user, "purchase.use") ? (
                <Button asChild size="sm" className="ml-auto">
                  <Link to="/purchase/orders">
                    <ShoppingCart aria-hidden="true" />
                    {t("dashboard:today.buy")}
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          <Group title={t("dashboard:today.toStart")} count={data.toStart.length}>
            {data.toStart.length === 0 ? <p className="text-muted-foreground">{t("dashboard:today.noneToStart")}</p> : data.toStart.map((order) => <StartCard key={order.id} order={order} onChanged={reload} />)}
          </Group>

          <Group title={t("dashboard:today.running")} count={data.running.length}>
            {data.running.length === 0 ? <p className="text-muted-foreground">{t("dashboard:today.noneRunning")}</p> : data.running.map((order) => <RunningCard key={order.id} order={order} onChanged={reload} />)}
          </Group>

          {can(user, "purchase.use") ? (
            <Group title={t("dashboard:today.toReceive")} count={data.toReceive.length}>
              {data.toReceive.length === 0 ? (
                <p className="text-muted-foreground">{t("dashboard:today.noneToReceive")}</p>
              ) : (
                data.toReceive.map((po) => (
                  <article key={po.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border border-border bg-card p-4">
                    <span className="text-lg font-bold">{po.poNumber}</span>
                    <span className="text-muted-foreground">{po.supplierName}</span>
                    <StatusBadge tone="progress">{t("purchase:status.Sent")}</StatusBadge>
                    <Button asChild className={`${BIG} ml-auto`}>
                      <Link to={`/purchase/orders/${po.id}`} aria-label={`${t("dashboard:today.receive")}: ${po.poNumber}`}>
                        <PackageCheck aria-hidden="true" />
                        {t("dashboard:today.receive")}
                      </Link>
                    </Button>
                  </article>
                ))
              )}
            </Group>
          ) : null}
        </div>
      )}
    </>
  );
}
