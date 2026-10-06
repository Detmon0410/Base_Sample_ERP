import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation } from "react-router";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { ListPage } from "@/components/common/ListPage";
import { useListQuery } from "@/hooks/useListQuery";
import { useResourceList } from "@/hooks/useResourceList";
import { priceListService } from "@/services/priceList.service";
import { formatCurrency, formatDate } from "@/utils/format";

import { PriceListFormPage } from "./PriceListFormPage";

const PATH = "/master/price-lists";

function PriceListsListPage() {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const { query, setQuery } = useListQuery({ defaultSort: "productCode" });
  const { search } = useLocation(); // kept when a row opens the detail sheet
  const list = useResourceList(priceListService, query);

  const columns = useMemo(
    () => [
      {
        key: "productCode",
        header: t("master:priceLists.columns.product"),
        sortable: true,
        render: (row) => (
          <span className="font-semibold">
            {row.productCode} <span className="font-normal text-muted-foreground">· {row.productName}</span>
          </span>
        ),
      },
      {
        key: "customerCode",
        header: t("master:priceLists.columns.customer"),
        sortable: true,
        render: (row) => `${row.customerCode} · ${row.customerName}`,
      },
      {
        key: "price",
        header: t("master:priceLists.columns.price"),
        sortable: true,
        align: "right",
        render: (row) => formatCurrency(row.price, i18n.language),
      },
      { key: "validFrom", header: t("master:priceLists.columns.validFrom"), sortable: true, render: (row) => formatDate(row.validFrom, i18n.language) },
      {
        key: "validTo",
        header: t("master:priceLists.columns.validTo"),
        sortable: true,
        render: (row) => (row.validTo ? formatDate(row.validTo, i18n.language) : t("master:priceLists.noEndDate")),
      },
      { key: "status", header: t("master:common.status"), sortable: true, render: (row) => <ActiveBadge status={row.status} /> },
      {
        key: "edit",
        header: <span className="sr-only">{t("master:common.edit")}</span>,
        align: "right",
        render: (row) => (
          <Link
            to={`${PATH}/${row.id}${search}`}
            className="inline-flex h-6 items-center rounded-md px-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${t("master:common.edit")} ${row.productCode} ${row.customerCode}`}
          >
            {t("master:common.edit")}
          </Link>
        ),
      },
    ],
    [t, i18n.language, search],
  );

  return (
    <ListPage
      title={t("nav:items.priceLists")}
      ariaLabel={t("nav:items.priceLists")}
      query={query}
      setQuery={setQuery}
      list={list}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={`${PATH}/new${search}`}
      newLabel={t("master:priceLists.new")}
      emptyText={t("master:priceLists.empty")}
      noResultText={t("master:priceLists.noResult")}
      searchLabel={t("master:priceLists.search")}
    />
  );
}

/** M10 Price lists. The list is always shown; /new and /:id open the form in a sheet on top of it. */
export function PriceListsPage() {
  return (
    <>
      <PriceListsListPage />
      <Routes>
        <Route path="new" element={<PriceListFormPage />} />
        <Route path=":id" element={<PriceListFormPage />} />
      </Routes>
    </>
  );
}
