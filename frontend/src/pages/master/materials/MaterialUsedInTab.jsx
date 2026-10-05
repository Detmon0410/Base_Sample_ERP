import { PackageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

import { SheetSection } from "@/components/common/SheetSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { bomLineService } from "@/services/bomLine.service";
import { formatNumber } from "@/utils/format";

/** Products whose bill of materials contains this material (read-only; edit the BOM on the product). */
export function MaterialUsedInTab({ materialId, unit }) {
  const { t, i18n } = useTranslation("master");
  const { search } = useLocation();
  const [state, setState] = useState({ status: "loading", items: [] });

  useEffect(() => {
    let cancelled = false;
    bomLineService
      .list({ materialId })
      .then(({ items }) => !cancelled && setState({ status: "ready", items }))
      .catch(() => !cancelled && setState({ status: "error", items: [] }));
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <p className="text-muted-foreground">{t("materials.usedInHint")}</p>
      {state.status === "loading" ? (
        <Skeleton className="h-24 w-full" aria-busy="true" />
      ) : state.status === "error" ? (
        <p role="alert" className="rounded-xl border bg-card p-5">
          {t("common.loadError")}
        </p>
      ) : state.items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t("materials.usedInEmpty")}</p>
      ) : (
        <SheetSection title={t("materials.usedInProduct")} icon={PackageIcon}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("materials.usedInProduct")}</TableHead>
              <TableHead className="text-right">{t("bom.qtyPerUnit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="whitespace-normal">
                  <Link
                    to={`/master/products/${item.productId}${search}`}
                    className="font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    {item.productCode} · {item.productName}
                  </Link>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(item.qty, i18n.language)} {unit}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </SheetSection>
      )}
    </div>
  );
}
