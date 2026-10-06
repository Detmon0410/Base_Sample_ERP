import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation } from "react-router";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { ListPage } from "@/components/common/ListPage";
import { useListQuery } from "@/hooks/useListQuery";
import { useResourceList } from "@/hooks/useResourceList";
import { productService } from "@/services/product.service";
import { formatCurrency } from "@/utils/format";

import { ProductFormPage } from "./ProductFormPage";

const PATH = "/master/products";

function ProductsListPage() {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const { query, setQuery } = useListQuery();
  const { search } = useLocation(); // kept when a row opens the detail sheet
  const list = useResourceList(productService, query);

  const columns = useMemo(
    () => [
      { key: "code", header: t("master:common.code"), sortable: true },
      { key: "name", header: t("master:common.name"), sortable: true },
      { key: "uom", header: t("master:materials.columns.uom"), sortable: true },
      {
        key: "sellingPrice",
        header: t("master:products.columns.sellingPrice"),
        sortable: true,
        align: "right",
        render: (row) => (row.sellingPrice == null ? "—" : formatCurrency(row.sellingPrice, i18n.language)),
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
            aria-label={`${t("master:common.edit")} ${row.code}`}
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
      title={t("nav:items.products")}
      ariaLabel={t("nav:items.products")}
      query={query}
      setQuery={setQuery}
      list={list}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={`${PATH}/new${search}`}
      newLabel={t("master:products.new")}
      emptyText={t("master:products.empty")}
      noResultText={t("master:products.noResult")}
      searchLabel={t("master:common.search")}
    />
  );
}

/** M3 Products. The list is always shown; /new and /:id open the form in a sheet on top of it. */
export function ProductsPage() {
  return (
    <>
      <ProductsListPage />
      <Routes>
        <Route path="new" element={<ProductFormPage />} />
        <Route path=":id" element={<ProductFormPage />} />
      </Routes>
    </>
  );
}
