import { PackagePlus, ShoppingCart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Route, Routes, useParams } from "react-router";

import { Section } from "@/components/common/FormFields";
import { RecordList } from "@/components/common/RecordList";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StockStatus } from "@/components/common/StockStatus";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";
import { materialsApi } from "@/services/master.service";
import { purchaseApi } from "@/services/purchase.service";
import { formatCurrency, formatNumber } from "@/utils/format";

import { PurchaseDetail } from "./PurchaseDetail";
import { PurchaseForm } from "./PurchaseForm";

const STATUSES = ["Draft", "Sent", "Received"];
const TONES = { Draft: "neutral", Sent: "progress", Received: "good" };

/** The first part of the Purchase page: the materials that are low or out, each with "Create PO" (the form opens ready for it). */
function StockToBuy() {
  const { t, i18n } = useTranslation("purchase");
  const { data } = useLoad(() => materialsApi.list({ pageSize: 200 }), []);
  const rows = (data?.items ?? []).filter((material) => material.stockStatus === "Low" || material.stockStatus === "Out");

  return (
    <Section icon={ShoppingCart} title={t("stock.title")} className="mb-6">
      {data && rows.length === 0 ? (
        <p className="text-muted-foreground">{t("stock.none")}</p>
      ) : (
        <Table data-stack>
          <TableHeader>
            <TableRow>
              <TableHead>{t("stock.code")}</TableHead>
              <TableHead>{t("stock.name")}</TableHead>
              <TableHead className="text-right">{t("stock.total")}</TableHead>
              <TableHead className="text-right">{t("stock.minLevel")}</TableHead>
              <TableHead>{t("stock.status")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("stock.create")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((material) => (
              <TableRow key={material.id}>
                <TableCell data-label={t("stock.code")}>{material.code}</TableCell>
                <TableCell data-label={t("stock.name")}>{material.name}</TableCell>
                <TableCell data-label={t("stock.total")} className="text-right">
                  {formatNumber(material.total, i18n.language)} {material.unit}
                </TableCell>
                <TableCell data-label={t("stock.minLevel")} className="text-right">
                  {formatNumber(material.minLevel, i18n.language)}
                </TableCell>
                <TableCell data-label={t("stock.status")}>
                  <StockStatus status={material.stockStatus} />
                </TableCell>
                <TableCell>
                  <Button asChild size="sm">
                    <Link to={`/purchase/orders/new?material=${material.id}`} aria-label={`${t("stock.create")}: ${material.code}`}>
                      <PackagePlus aria-hidden="true" />
                      {t("stock.create")}
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Section>
  );
}

function EditPage() {
  const { id } = useParams();
  return <PurchaseForm id={id} />;
}

function DetailPage() {
  const { id } = useParams();
  return <PurchaseDetail id={id} />;
}

/**
 * Purchase (Admin and Factory Worker): the page with the stock that is low and the list of the purchase orders; a new PO; one PO with its
 * lines, its status buttons, the payment, the files and the printed form. The status is moved by hand: Draft, Sent, Received.
 */
export function PurchasePage() {
  const { t, i18n } = useTranslation(["purchase", "master"]);
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={purchaseApi}
            base="/purchase/orders"
            title={t("title")}
            canCreate
            newLabel={t("new")}
            above={<StockToBuy />}
            statusOptions={[{ value: "", label: t("master:list.all") }, ...STATUSES.map((value) => ({ value, label: t(`status.${value}`) }))]}
            statusOf={(row) => <StatusBadge tone={TONES[row.status]}>{t(`status.${row.status}`)}</StatusBadge>}
            columns={[
              { key: "poNumber", header: t("poNumber") },
              { key: "supplierName", header: t("supplier") },
              { key: "requiredDate", header: t("requiredShort") },
              { key: "total", header: t("total"), numeric: true, cell: (row) => formatCurrency(row.total, i18n.language) },
              { key: "paid", header: t("paid"), cell: (row) => <StatusBadge tone={row.paid ? "good" : "warn"}>{row.paid ? t("paidYes") : t("paidNo")}</StatusBadge> },
            ]}
          />
        }
      />
      <Route path="new" element={<PurchaseForm />} />
      <Route path=":id/edit" element={<EditPage />} />
      <Route path=":id" element={<DetailPage />} />
    </Routes>
  );
}
