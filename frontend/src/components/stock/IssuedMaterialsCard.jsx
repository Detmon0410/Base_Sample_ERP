import { PackageMinusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { SheetSection } from "@/components/common/SheetSection";
import { movementService } from "@/services/stock.service";
import { formatNumber } from "@/utils/format";

/**
 * "Materials issued" on a Work Order: what the work order took out of the raw material warehouse when it started
 * (the sum of its stock movements, so a revert or a cancel that gave the materials back leaves nothing to show).
 * Only Factory users (and Admin) see Stock; for anybody else, or when nothing was issued, it shows nothing.
 */
export function IssuedMaterialsCard({ workOrder }) {
  const { t, i18n } = useTranslation("stock");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    movementService
      .list({ q: workOrder.number, kind: "material", pageSize: 100 })
      .then(({ items }) => {
        const sums = new Map();
        for (const move of items.filter((item) => item.docType === "WO" && item.docNumber === workOrder.number && item.type === "consume")) {
          const key = `${move.itemId}-${move.warehouseId}`;
          const row = sums.get(key) ?? { key, code: move.itemCode, name: move.itemName, uom: move.uom, warehouse: move.warehouseCode, qty: 0 };
          row.qty = Math.round((row.qty - move.qty) * 1000) / 1000;
          sums.set(key, row);
        }
        if (!cancelled) setRows([...sums.values()].filter((row) => row.qty > 0));
      })
      .catch(() => !cancelled && setRows([]));
    return () => {
      cancelled = true;
    };
  }, [workOrder.number, workOrder.status]);

  if (rows.length === 0) return null;
  return (
    <SheetSection title={t("issued.title")} icon={PackageMinusIcon}>
      <p className="mb-3 text-sm text-muted-foreground">{t("issued.hint")}</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[26rem] text-[15px] text-[#666]">
          <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
            <tr className="text-left text-sm font-semibold">
              <th className="h-10 px-3">{t("issued.material")}</th>
              <th className="h-10 px-3">{t("issued.warehouse")}</th>
              <th className="h-10 px-3 text-right">{t("issued.qty")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                <td className="px-3 py-2">
                  <span className="font-semibold text-slate-900">{row.code}</span> · {row.name}
                </td>
                <td className="px-3 py-2">{row.warehouse}</td>
                <td className="px-3 py-2 text-right font-semibold">{`${formatNumber(row.qty, i18n.language)} ${row.uom}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SheetSection>
  );
}
