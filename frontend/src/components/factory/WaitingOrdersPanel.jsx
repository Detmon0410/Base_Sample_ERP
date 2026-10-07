import { CheckCircle2Icon, InboxIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { PANEL_CLASS } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { listWaitingOrders } from "@/services/factory.service";
import { formatDate, formatNumber } from "@/utils/format";
import { onRefresh } from "@/utils/masterEvents";

/**
 * "Waiting for a work order": the sales orders that Sale sent to the factory and that still have quantity without a
 * Work Order. This is how the factory receives a sales order: one button per line opens a new Work Order with
 * the order, the product and the quantity that is left already filled in. It reloads when a Work Order is saved or
 * the Refresh button of the header is pressed.
 */
export function WaitingOrdersPanel({ canCreate }) {
  const { t, i18n } = useTranslation("factory");
  const navigate = useNavigate();
  const [state, setState] = useState({ status: "loading", orders: [] });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => onRefresh(() => setReloadKey((key) => key + 1)), []);
  useEffect(() => {
    let cancelled = false;
    listWaitingOrders()
      .then((orders) => !cancelled && setState({ status: "ready", orders }))
      .catch(() => !cancelled && setState({ status: "error", orders: [] }));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const language = i18n.language;
  const create = (order, line) => navigate("/factory/work-orders/new", { state: { saleOrderId: order.id, productId: line.productId, qty: line.remaining } });

  if (state.status === "loading") return null;
  if (state.status === "error") return null; // the board below shows its own error

  const rows = state.orders.flatMap((order) => order.lines.map((line) => ({ order, line })));

  return (
    <section className={`${PANEL_CLASS} mb-4 p-4`} aria-label={t("waiting.title")}>
      <div className="flex items-center gap-3">
        <InboxIcon className="size-6 shrink-0 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-bold">{t("waiting.title")}</h2>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-bold text-amber-800">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-muted-foreground">
          <CheckCircle2Icon className="size-5 shrink-0 text-success" aria-hidden="true" /> {t("waiting.none")}
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{t("waiting.hint")}</p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[44rem] text-[15px] text-[#666]">
              <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                <tr className="text-left text-sm font-semibold">
                  <th className="h-10 px-3">{t("waiting.columns.order")}</th>
                  <th className="h-10 px-3">{t("waiting.columns.product")}</th>
                  <th className="h-10 px-3">{t("waiting.columns.delivery")}</th>
                  <th className="h-10 w-56 px-3">{t("waiting.columns.left")}</th>
                  <th className="h-10 w-48 px-3">
                    <span className="sr-only">{t("steps.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ order, line }) => {
                  const covered = line.qty > 0 ? Math.round(((line.qty - line.remaining) / line.qty) * 100) : 0;
                  return (
                    <tr key={`${order.id}-${line.productId}`} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-900">{order.number}</p>
                        <p className="text-sm">{order.customerName}</p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-slate-900">{line.productName}</p>
                        <p className="text-sm">{line.productCode}</p>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{order.deliveryDate ? formatDate(order.deliveryDate, language) : "—"}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-semibold text-amber-700">
                          {t("waiting.left", { remaining: formatNumber(line.remaining, language), qty: formatNumber(line.qty, language), uom: line.uom })}
                        </p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${covered}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        {canCreate ? (
                          <Button type="button" size="sm" className="h-9" onClick={() => create(order, line)}>
                            <PlusIcon aria-hidden="true" /> {t("waiting.create")}
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
