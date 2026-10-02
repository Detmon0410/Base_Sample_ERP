import { CircleMinusIcon } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ListPage } from "@/components/common/ListPage";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useListQuery } from "@/hooks/useListQuery";
import { useResourceList } from "@/hooks/useResourceList";
import { customerService } from "@/services/customer.service";
import { formatCurrency } from "@/utils/format";

/** M1 — /master/customers */
export function CustomersListPage() {
  const { t, i18n } = useTranslation(["master", "nav"]);
  const { query, setQuery } = useListQuery();
  const list = useResourceList(customerService, query);

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
      {
        key: "creditLimit",
        header: t("master:customers.columns.creditLimit"),
        sortable: true,
        align: "right",
        render: (row) => (row.creditLimit == null ? "—" : formatCurrency(row.creditLimit, i18n.language)),
      },
      {
        key: "status",
        header: t("master:common.status"),
        sortable: true,
        render: (row) =>
          row.status === "active" ? (
            <StatusBadge tone="success">{t("master:common.active")}</StatusBadge>
          ) : (
            <StatusBadge tone="neutral" icon={CircleMinusIcon}>
              {t("master:common.inactive")}
            </StatusBadge>
          ),
      },
      {
        key: "edit",
        header: <span className="sr-only">{t("master:common.edit")}</span>,
        align: "right",
        render: (row) => (
          <Link
            to={`/master/customers/${row.id}`}
            className="inline-flex h-10 items-center rounded-md px-2 font-semibold text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`${t("master:common.edit")} ${row.code}`}
          >
            {t("master:common.edit")}
          </Link>
        ),
      },
    ],
    [t, i18n.language],
  );

  return (
    <ListPage
      title={t("nav:items.customers")}
      ariaLabel={t("nav:items.customers")}
      query={query}
      setQuery={setQuery}
      list={list}
      columns={columns}
      rowTo={(row) => `/master/customers/${row.id}`}
      newTo="/master/customers/new"
      newLabel={t("master:customers.new")}
      emptyText={t("master:customers.empty")}
      noResultText={t("master:customers.noResult")}
      searchLabel={t("master:common.search")}
    />
  );
}
