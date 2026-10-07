import { ShoppingCartIcon } from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { SheetSection } from "@/components/common/SheetSection";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { canWork } from "@/config/purchase";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatNumber } from "@/utils/format";

/**
 * "Open purchase orders" in the stock sheet of a material: what suppliers still owe (the open part of the POs that
 * were sent), so nobody orders the same material twice. The PO number is a link for Purchase users only.
 */
export function OpenOrdersCard({ orders, uom }) {
  const { t, i18n } = useTranslation("stock");
  const { user } = useAuth();
  const language = i18n.language;
  return (
    <SheetSection title={t("item.cards.openOrders")} icon={ShoppingCartIcon}>
      <p className="mb-3 text-sm text-muted-foreground">{t("item.openOrders.hint")}</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[34rem] text-[15px] text-[#666]">
          <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
            <tr className="text-left text-sm font-semibold">
              <th className="h-10 px-3">{t("item.openOrders.po")}</th>
              <th className="h-10 px-3">{t("item.openOrders.supplier")}</th>
              <th className="h-10 px-3">{t("item.openOrders.expected")}</th>
              <th className="h-10 px-3 text-right">{t("item.openOrders.open")}</th>
              <th className="h-10 px-3">{" "}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                <td className="px-3 py-2 font-semibold">
                  {canWork(user) ? (
                    <Link to={`/purchase/orders/${order.id}`} className="text-primary underline-offset-2 hover:underline">
                      {order.number}
                    </Link>
                  ) : (
                    order.number
                  )}
                </td>
                <td className="px-3 py-2">{order.supplier}</td>
                <td className="px-3 py-2 whitespace-nowrap">{order.expectedDate ? formatDate(order.expectedDate, language) : "—"}</td>
                <td className="px-3 py-2 text-right font-semibold whitespace-nowrap text-slate-900">{`${formatNumber(order.qty, language)} ${uom}`}</td>
                <td className="px-3 py-2">
                  <DocumentStatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SheetSection>
  );
}
