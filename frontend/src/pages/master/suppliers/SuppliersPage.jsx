import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useLocation } from "react-router";

import { ActiveBadge } from "@/components/common/ActiveBadge";
import { ListPage } from "@/components/common/ListPage";
import { useListQuery } from "@/hooks/useListQuery";
import { useResourceList } from "@/hooks/useResourceList";
import { supplierService } from "@/services/supplier.service";

import { SupplierFormPage } from "./SupplierFormPage";

const PATH = "/master/suppliers";

function SuppliersListPage() {
  const { t } = useTranslation(["master", "nav"]);
  const { query, setQuery } = useListQuery();
  const { search } = useLocation(); // kept when a row opens the detail sheet
  const list = useResourceList(supplierService, query);

  const columns = useMemo(
    () => [
      { key: "code", header: t("master:common.code"), sortable: true, className: "font-semibold" },
      { key: "name", header: t("master:common.name"), sortable: true },
      {
        key: "paymentTerms",
        header: t("master:customers.columns.paymentTerms"),
        sortable: true,
        render: (row) => (row.paymentTerms ? t(`master:paymentTerms.${row.paymentTerms}`) : "—"),
      },
      { key: "status", header: t("master:common.status"), sortable: true, render: (row) => <ActiveBadge status={row.status} /> },
      {
        key: "edit",
        header: <span className="sr-only">{t("master:common.edit")}</span>,
        align: "right",
        render: (row) => (
          <Link
            to={`${PATH}/${row.id}${search}`}
            className="inline-flex h-10 items-center rounded-md px-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${t("master:common.edit")} ${row.code}`}
          >
            {t("master:common.edit")}
          </Link>
        ),
      },
    ],
    [t, search],
  );

  return (
    <ListPage
      title={t("nav:items.suppliers")}
      ariaLabel={t("nav:items.suppliers")}
      query={query}
      setQuery={setQuery}
      list={list}
      columns={columns}
      rowTo={(row) => `${PATH}/${row.id}${search}`}
      newTo={`${PATH}/new${search}`}
      newLabel={t("master:suppliers.new")}
      emptyText={t("master:suppliers.empty")}
      noResultText={t("master:suppliers.noResult")}
      searchLabel={t("master:common.search")}
    />
  );
}

/** M2 Suppliers. The list is always shown; /new and /:id open the form in a sheet on top of it. */
export function SuppliersPage() {
  return (
    <>
      <SuppliersListPage />
      <Routes>
        <Route path="new" element={<SupplierFormPage />} />
        <Route path=":id" element={<SupplierFormPage />} />
      </Routes>
    </>
  );
}
