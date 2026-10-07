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

  return (
    <section className={`${PANEL_CLASS} mb-4 p-4`} aria-label={t("waiting.title")}>
      <div className="flex items-start gap-3">
        <InboxIcon className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold">{t("waiting.title")}</h2>
          {state.orders.length === 0 ? (
            <p className="mt-1 flex items-center gap-2 text-muted-foreground">
              <CheckCircle2Icon className="size-5 shrink-0 text-success" aria-hidden="true" /> {t("waiting.none")}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{t("waiting.hint")}</p>
              <ul className="mt-3 flex flex-col gap-3">
                {state.orders.map((order) => (
                  <li key={order.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="font-semibold text-slate-900">
                      {order.number} <span className="font-normal text-muted-foreground">· {order.customerName}</span>
                      {order.deliveryDate ? <span className="font-normal text-muted-foreground"> · {t("waiting.delivery", { date: formatDate(order.deliveryDate, language) })}</span> : null}
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {order.lines.map((line) => (
                        <li key={line.productId} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="min-w-0">
                            <span className="font-semibold">{line.productCode}</span> <span className="text-slate-700">· {line.productName}</span>
                            <span className="ml-2 rounded-md bg-amber-50 px-2 py-0.5 text-sm font-semibold text-amber-800">
                              {t("waiting.left", { remaining: formatNumber(line.remaining, language), qty: formatNumber(line.qty, language), uom: line.uom })}
                            </span>
                          </span>
                          {canCreate ? (
                            <Button type="button" size="sm" className="h-9" onClick={() => create(order, line)}>
                              <PlusIcon aria-hidden="true" /> {t("waiting.create")}
                            </Button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
