import { InboxIcon, PackageCheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { PANEL_CLASS } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { purchaseOrderService } from "@/services/purchase.service";
import { formatDate, formatNumber } from "@/utils/format";
import { onRefresh } from "@/utils/masterEvents";

/**
 * "Waiting for goods": the purchase orders that were sent (or partly received) and still wait for goods. This is part of what the
 * red number of Goods receipt in the menu counts (the other part is the draft receipts to post, which are rows of the list below).
 * One button per row opens a new goods receipt for that purchase order. Nothing is drawn when nothing waits.
 */
export function WaitingGoodsPanel({ canCreate }) {
  const { t, i18n } = useTranslation("purchase");
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => onRefresh(() => setReloadKey((key) => key + 1)), []);
  useEffect(() => {
    let cancelled = false;
    purchaseOrderService
      .list({ receivable: 1, pageSize: 100, sort: "expectedDate" })
      .then(({ items }) => !cancelled && setRows(items))
      .catch(() => !cancelled && setRows([])); // the list below shows its own error
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (rows.length === 0) return null;
  const language = i18n.language;

  return (
    <section className={`${PANEL_CLASS} mb-4 p-4`} aria-label={t("waitingGoods.title")}>
      <div className="flex items-center gap-3">
        <InboxIcon className="size-6 shrink-0 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-bold">{t("waitingGoods.title")}</h2>
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-bold text-amber-800">{rows.length}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("waitingGoods.hint")}</p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[44rem] text-[15px] text-[#666]">
          <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
            <tr className="text-left text-sm font-semibold">
              <th className="h-10 px-3">{t("waitingGoods.columns.po")}</th>
              <th className="h-10 px-3">{t("waitingGoods.columns.supplier")}</th>
              <th className="h-10 px-3">{t("waitingGoods.columns.expected")}</th>
              <th className="h-10 px-3">{t("waitingGoods.columns.received")}</th>
              <th className="h-10 w-52 px-3">
                <span className="sr-only">{t("waitingGoods.create")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((po) => (
              <tr key={po.id} className="border-t border-slate-200">
                <td className="px-3 py-2 font-semibold">{po.number}</td>
                <td className="px-3 py-2">{po.supplierName}</td>
                <td className="px-3 py-2">{po.expectedDate ? formatDate(po.expectedDate, language) : "—"}</td>
                <td className="px-3 py-2">{t("orders.received", { received: formatNumber(po.progress.received, language), ordered: formatNumber(po.progress.ordered, language) })}</td>
                <td className="px-3 py-1.5 text-right">
                  {canCreate ? (
                    <Button type="button" size="sm" className="h-9" onClick={() => navigate("/purchase/receipts/new", { state: { poId: po.id } })}>
                      <PackageCheckIcon aria-hidden="true" /> {t("waitingGoods.create")}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
