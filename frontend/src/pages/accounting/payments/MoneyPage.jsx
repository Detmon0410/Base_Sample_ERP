import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes, useLocation } from "react-router";

import { RemountOnId } from "@/components/common/RemountOnId";
import { DocumentListPage } from "@/components/documents/DocumentListPage";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { canWork, DIRECTIONS, MONEY_STATUSES } from "@/config/accounting";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { customerReceiptService, supplierPaymentService } from "@/services/accounting.service";
import { customerService } from "@/services/customer.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { supplierService } from "@/services/supplier.service";
import { formatCurrency, formatDate } from "@/utils/format";

import { MoneySheet } from "./MoneySheet";

const SERVICES = { ar: customerReceiptService, ap: supplierPaymentService };
const EXTRA_KEYS = ["party", "method"];

function MoneyListPage({ direction }) {
  const { t, i18n } = useTranslation(["accounting", "nav"]);
  const d = DIRECTIONS[direction];
  const ns = direction === "ar" ? "receipts" : "payments";
  const { user } = useAuth();
  const { search } = useLocation();
  const { options: parties } = useOptions(direction === "ar" ? customerService : supplierService);
  const { options: methods } = useOptions(simpleMasterServices.paymentMethods);

  const columns = useMemo(() => {
    const language = i18n.language;
    return [
      { key: "number", header: t(`accounting:${ns}.columns.number`), sortable: true },
      { key: "date", header: t("accounting:columns.date"), sortable: true, render: (row) => formatDate(row.date, language) },
      { key: "partyCode", header: t(`accounting:${ns}.columns.party`), sortable: true, render: (row) => `${row.partyCode} · ${row.partyName}` },
      { key: "docNumber", secondary: true, header: t(`accounting:${ns}.columns.doc`), sortable: true },
      { key: "amount", header: t("accounting:columns.amount"), sortable: true, align: "right", render: (row) => formatCurrency(row.amount, language), sum: (value) => formatCurrency(value, language) },
      { key: "methodName", secondary: true, header: t("accounting:columns.method") },
      { key: "bankAccountName", secondary: true, header: t("accounting:columns.bank"), render: (row) => row.bankAccountName ?? "—" },
      { key: "status", header: t("accounting:columns.status"), sortable: true, render: (row) => <DocumentStatusBadge status={row.status} /> },
    ];
  }, [t, i18n.language, ns]);

  const extraFilters = useMemo(
    () => [
      { key: "party", label: t(`accounting:${ns}.columns.party`), kind: "search", options: parties.map((party) => ({ value: String(party.id), label: `${party.code} · ${party.name}` })) },
      { key: "method", label: t("accounting:columns.method"), kind: "options", options: methods.map((method) => ({ value: String(method.id), label: method.name })) },
    ],
    [parties, methods, t, ns],
  );

  return (
    <DocumentListPage
      title={t(`nav:items.${ns}`)}
      service={SERVICES[direction]}
      statuses={MONEY_STATUSES}
      stepper
      stepperUnit="payments"
      customerFilter={false}
      extraFilters={extraFilters}
      extraKeys={EXTRA_KEYS}
      dateLabel={t("accounting:columns.date")}
      columns={columns}
      rowTo={(row) => `${d.moneyPath}/${row.id}${search}`}
      newTo={canWork(user) ? `${d.moneyPath}/new${search}` : null}
      newLabel={t(`accounting:${ns}.new`)}
      emptyText={t(`accounting:${ns}.empty`)}
      noResultText={t("accounting:noResult")}
      searchLabel={t(`accounting:${ns}.search`)}
    />
  );
}

/** C2 / C4. The list is always shown; /new and /:id open the sheet on top of it. */
export function MoneyPage({ direction }) {
  return (
    <>
      <MoneyListPage direction={direction} />
      <Routes>
        <Route path="new" element={<RemountOnId><MoneySheet direction={direction} /></RemountOnId>} />
        <Route path=":id" element={<RemountOnId><MoneySheet direction={direction} /></RemountOnId>} />
      </Routes>
    </>
  );
}

export const ReceiptsPage = () => <MoneyPage direction="ar" />;
export const PaymentsPage = () => <MoneyPage direction="ap" />;
