import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router";

import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentLink } from "@/components/stock/DocumentLink";
import { SignedQty } from "@/components/stock/SignedQty";
import { MOVEMENT_TYPES } from "@/config/stock";
import { useOptions } from "@/hooks/useOptions";
import { materialService } from "@/services/material.service";
import { productService } from "@/services/product.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { movementService } from "@/services/stock.service";
import { formatDateTime, formatNumber } from "@/utils/format";

const EXTRA_KEYS = ["type", "kind", "warehouse", "item"];

/** T2 Stock movements: the ledger, read only, newest first. A row links to the document that made it. */
export function StockMovementsPage() {
  const { t, i18n } = useTranslation(["stock", "nav"]);
  const [params] = useSearchParams();
  const { options: warehouses } = useOptions(simpleMasterServices.warehouses);
  const { options: materials } = useOptions(materialService);
  const { options: products } = useOptions(productService);

  // ?item=material-3 comes from the item sheet ("All movements"): it shows as a chip that can be removed
  const itemParam = params.get("item") ?? "";
  const itemOption = useMemo(() => {
    const [kind, id] = itemParam.split("-");
    const found = (kind === "product" ? products : materials).find((row) => String(row.id) === id);
    return itemParam ? [{ value: itemParam, label: found ? `${found.code} · ${found.name}` : itemParam }] : [];
  }, [itemParam, materials, products]);

  const columns = useMemo(() => {
    const language = i18n.language;
    return [
      { key: "number", header: t("stock:movements.columns.number"), sortable: false, render: (row) => <span className="font-semibold whitespace-nowrap text-slate-900">{row.number ?? "—"}</span> },
      { key: "at", header: t("stock:movements.columns.at"), sortable: true, render: (row) => <span className="whitespace-nowrap">{formatDateTime(row.at, language)}</span> },
      { key: "type", header: t("stock:movements.columns.type"), sortable: true, render: (row) => t(`stock:movements.types.${row.type}`) },
      {
        key: "itemCode",
        header: t("stock:movements.columns.item"),
        sortable: true,
        render: (row) => (
          <Link to={`/stock/${row.itemType}s/${row.itemId}`} className="font-semibold text-primary underline-offset-2 hover:underline">
            {row.itemCode} <span className="font-normal text-[#666]">· {row.itemName}</span>
          </Link>
        ),
      },
      { key: "fromTo", header: t("stock:movements.columns.fromTo"), render: (row) => <span className="whitespace-nowrap">{`${row.from ?? "—"} → ${row.to ?? "—"}`}</span> },
      { key: "qty", header: t("stock:movements.columns.qty"), sortable: true, align: "right", render: (row) => <SignedQty value={row.qty} uom={row.uom} language={language} /> },
      { key: "balanceAfter", header: t("stock:movements.columns.balance"), align: "right", render: (row) => `${formatNumber(row.balanceAfter, language)} ${row.uom}` },
      { key: "docNumber", header: t("stock:movements.columns.document"), render: (row) => <DocumentLink docType={row.docType} docId={row.docId} docNumber={row.docNumber} /> },
      { key: "by", header: t("stock:movements.columns.by"), render: (row) => row.by ?? "—" },
    ];
  }, [t, i18n.language]);

  const extraFilters = useMemo(
    () => [
      { key: "type", label: t("stock:movements.filters.type"), kind: "options", options: MOVEMENT_TYPES.map((type) => ({ value: type, label: t(`stock:movements.types.${type}`) })) },
      { key: "kind", label: t("stock:movements.filters.kind"), kind: "options", options: ["material", "product"].map((kind) => ({ value: kind, label: t(`stock:movements.kinds.${kind}`) })) },
      { key: "warehouse", label: t("stock:movements.filters.warehouse"), kind: "options", options: warehouses.map((warehouse) => ({ value: String(warehouse.id), label: `${warehouse.code} · ${warehouse.name}` })) },
      ...(itemOption.length ? [{ key: "item", label: t("stock:movements.columns.item"), kind: "options", options: itemOption }] : []),
    ],
    [warehouses, itemOption, t],
  );

  return (
    <DocumentListPage
      title={t("nav:items.stockMovements")}
      service={movementService}
      statuses={null}
      defaultSort="-at"
      customerFilter={false}
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      dateLabel={t("stock:movements.dateLabel")}
      columns={columns}
      newTo={null}
      emptyText={t("stock:movements.empty")}
      noResultText={t("stock:movements.noResult")}
      searchLabel={t("stock:movements.search")}
    />
  );
}
