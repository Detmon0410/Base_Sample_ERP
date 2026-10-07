import { ArrowRightLeftIcon, BoxesIcon, HistoryIcon, PackageIcon, PencilLineIcon, PlusIcon, WarehouseIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router";

import { DetailFields } from "@/components/common/DetailLayout";
import { DetailSheet } from "@/components/common/DetailSheet";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { CARD_CLASS, SheetSection } from "@/components/common/SheetSection";
import { DocumentLink } from "@/components/stock/DocumentLink";
import { OpenOrdersCard } from "@/components/stock/OpenOrdersCard";
import { SignedQty } from "@/components/stock/SignedQty";
import { StockStatusBadge } from "@/components/stock/StockStatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { canWork } from "@/config/stock";
import { useAuth } from "@/hooks/useAuth";
import { useSheetExit } from "@/hooks/useSheetExit";
import { getStockItem } from "@/services/stock.service";
import { formatDateTime, formatNumber } from "@/utils/format";
import { isAdmin } from "@/utils/permissions";
import { onRefresh } from "@/utils/masterEvents";

/**
 * The stock of one material or product, read only: what is on hand (in every warehouse), the last movements and, for a
 * material, the products that use it. The way to change a number is an adjustment, which this sheet offers.
 */
export function StockItemSheet({ kind }) {
  const { t, i18n } = useTranslation(["stock", "sale"]);
  const language = i18n.language;
  const { id } = useParams();
  const { search } = useLocation();
  const { user } = useAuth();
  const { leaving, exitTo } = useSheetExit();
  const [state, setState] = useState({ status: "loading", item: null });
  const [reloadKey, setReloadKey] = useState(0);
  const listPath = `/stock${search}`;

  useEffect(() => onRefresh(() => setReloadKey((current) => current + 1)), []);
  useEffect(() => {
    let cancelled = false;
    getStockItem(kind, id)
      .then((item) => !cancelled && setState({ status: "ready", item }))
      .catch((error) => !cancelled && setState({ status: error?.status === 404 ? "notFound" : "error", item: null }));
    return () => {
      cancelled = true;
    };
  }, [kind, id, reloadKey]);

  const sheet = { open: !leaving, onClose: () => exitTo(listPath), defaultWidth: 760, widthKey: "kanou.stockSheetWidth" };

  if (state.status === "loading") {
    return (
      <DetailSheet title={t(`stock:item.${kind}Title`)} {...sheet}>
        <div className="flex flex-col gap-4 p-5" aria-busy="true">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </DetailSheet>
    );
  }
  if (state.status !== "ready") {
    return (
      <DetailSheet title={t(`stock:item.${kind}Title`)} {...sheet}>
        <div role="alert" className={`m-5 flex flex-col items-start gap-4 p-6 ${CARD_CLASS}`}>
          <p>{t(state.status === "notFound" ? "stock:item.notFound" : "stock:item.loadError")}</p>
          <Button asChild variant="outline">
            <Link to={listPath}>{t("stock:item.backToList")}</Link>
          </Button>
        </div>
      </DetailSheet>
    );
  }

  const item = state.item;
  const isMaterial = kind === "material";
  const actions = (
    <>
      {canWork(user) ? (
        <Button asChild size="sm" className="h-9">
          <Link to="/stock/adjustments/new" state={{ itemType: kind, itemId: item.id, reason: item.hasMovements ? undefined : "opening" }}>
            <PlusIcon aria-hidden="true" /> {t(item.hasMovements ? "stock:item.newAdjustment" : "stock:item.setOpening")}
          </Link>
        </Button>
      ) : null}
      {isAdmin(user) ? (
        <Button asChild variant="ghost" size="sm" className="h-9 text-slate-600">
          <Link to={`/master/${isMaterial ? "materials" : "products"}/${item.id}`}>
            <PencilLineIcon aria-hidden="true" /> {t("stock:item.editMaster")}
          </Link>
        </Button>
      ) : null}
    </>
  );

  return (
    <DetailSheet title={`${item.code} · ${item.name}`} badge={<StockStatusBadge status={item.status} />} actions={actions} {...sheet}>
      <SheetFormBody>
        <SheetSection title={t("stock:item.cards.summary")} icon={PackageIcon}>
          {item.hasMovements ? null : <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{t("stock:item.noStockYet")}</p>}
          <DetailFields
            items={[
              { label: t("stock:item.fields.onHand"), value: <span className="text-lg font-bold text-slate-900">{`${formatNumber(item.onHand, language)} ${item.uom}`}</span> },
              ...(isMaterial ? [{ label: t("stock:item.fields.onOrder"), value: item.onOrder > 0 ? `${formatNumber(item.onOrder, language)} ${item.uom}` : "—" }] : []),
              { label: t("stock:item.fields.reserved"), value: `${formatNumber(item.reserved, language)} ${item.uom}` },
              { label: t("stock:item.fields.available"), value: <span className="text-lg font-bold text-slate-900">{`${formatNumber(item.available, language)} ${item.uom}`}</span> },
              { label: t("stock:item.fields.status"), value: <StockStatusBadge status={item.status} /> },
              ...(isMaterial
                ? [
                    { label: t("stock:item.fields.reorderPoint"), value: item.reorderPoint != null ? `${formatNumber(item.reorderPoint, language)} ${item.uom}` : "—" },
                    { label: t("stock:item.fields.reorderQty"), value: item.reorderQty != null ? `${formatNumber(item.reorderQty, language)} ${item.uom}` : "—" },
                  ]
                : [{ label: t("stock:item.fields.category"), value: item.category || "—" }]),
            ]}
          />
        </SheetSection>

        <SheetSection title={t("stock:item.cards.warehouses")} icon={WarehouseIcon}>
          <ul className="divide-y divide-slate-200/70">
            {item.byWarehouse.map((row) => (
              <li key={row.warehouseId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span>
                  <span className="font-semibold text-slate-900">{row.code}</span> <span className="text-muted-foreground">· {row.name}</span>
                </span>
                <span>
                  <span className="font-semibold">{`${formatNumber(row.onHand, language)} ${item.uom}`}</span>
                  <span className="ml-3 text-sm text-muted-foreground">{`${t("stock:item.fields.available")} ${formatNumber(row.available, language)}`}</span>
                </span>
              </li>
            ))}
          </ul>
        </SheetSection>

        <SheetSection
          title={t("stock:item.cards.movements")}
          icon={HistoryIcon}
          aside={
            <Button asChild variant="ghost" size="sm" className="h-9 text-primary">
              <Link to={`/stock/movements?item=${kind}-${item.id}`}>
                {t("stock:item.allMovements")} <ArrowRightLeftIcon aria-hidden="true" />
              </Link>
            </Button>
          }
        >
          {item.lastMovements.length === 0 ? (
            <p className="text-muted-foreground">{t("stock:item.noMovements")}</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[34rem] text-[15px] text-[#666]">
                <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                  <tr className="text-left text-sm font-semibold">
                    <th className="h-10 px-3">{t("stock:movements.columns.at")}</th>
                    <th className="h-10 px-3">{t("stock:movements.columns.type")}</th>
                    <th className="h-10 px-3 text-right">{t("stock:movements.columns.qty")}</th>
                    <th className="h-10 px-3">{t("stock:movements.columns.document")}</th>
                  </tr>
                </thead>
                <tbody>
                  {item.lastMovements.map((move) => (
                    <tr key={move.id} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(move.at, language)}</td>
                      <td className="px-3 py-2">{t(`stock:movements.types.${move.type}`)}</td>
                      <td className="px-3 py-2 text-right">
                        <SignedQty value={move.qty} uom={move.uom} language={language} />
                      </td>
                      <td className="px-3 py-2">
                        <DocumentLink docType={move.docType} docId={move.docId} docNumber={move.docNumber} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SheetSection>

        {isMaterial && item.openOrders?.length > 0 ? <OpenOrdersCard orders={item.openOrders} uom={item.uom} /> : null}

        {isMaterial ? (
          <SheetSection title={t("stock:item.cards.usedIn")} icon={BoxesIcon}>
            <p className="mb-3 text-sm text-muted-foreground">{t("stock:item.usedInHint")}</p>
            <ul className="divide-y divide-slate-200/70">
              {item.usedIn.map((row) => (
                <li key={row.productId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span>
                    <span className="font-semibold text-slate-900">{row.code}</span> <span className="text-muted-foreground">· {row.name}</span>
                  </span>
                  <span>{t("stock:item.perUnit", { qty: formatNumber(row.qtyPerUnit, language), uom: item.uom })}</span>
                </li>
              ))}
            </ul>
          </SheetSection>
        ) : null}
      </SheetFormBody>
    </DetailSheet>
  );
}
