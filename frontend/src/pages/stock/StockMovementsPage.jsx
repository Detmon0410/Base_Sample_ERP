import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { NativeSelect } from "@/components/common/FormFields";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";
import { stockApi } from "@/services/master.service";
import { formatDateTime, formatNumber } from "@/utils/format";

const PAGE_SIZE = 20;
const KINDS = ["Add", "Deduct", "Adjust"];
const DAY = /^\d{4}-\d{2}-\d{2}$/; // a typed date is sent only when it has the shape of a date

/**
 * The ledger of every stock change of every material, newest first (docs/specs/s4-stock-group.md, section 3.2). Read only, for an Admin
 * and a Worker. Search by material, lot, production order or note; filter by type and by the date of the change. A click on a row
 * opens the material, where an Admin changes the stock.
 */
export function StockMovementsPage() {
  const { t, i18n } = useTranslation(["master", "common"]);
  const navigate = useNavigate();
  const language = i18n.language;
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const params = { q: q.trim() || undefined, type: type || undefined, from: DAY.test(from) ? from : undefined, to: DAY.test(to) ? to : undefined, page, pageSize: PAGE_SIZE };
  const { data, error, loading } = useLoad(() => stockApi.listChanges(params), [q, type, params.from, params.to, page]);
  const rows = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const filtered = Boolean(q || type || from || to);

  const change = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <>
      <PageHeader title={t("master:stock.movementsTitle")} />

      <div className="mb-4 flex flex-wrap items-end gap-6">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-semibold">
          {t("master:stock.searchLabel")}
          <Input type="search" value={q} onChange={change(setQ)} />
        </label>
        <label className="flex w-44 flex-col gap-1 text-sm font-semibold">
          {t("master:stock.colType")}
          <NativeSelect
            value={type}
            onChange={change(setType)}
            options={[{ value: "", label: t("master:list.all") }, ...KINDS.map((value) => ({ value, label: t(`master:stock.kinds.${value}`) }))]}
          />
        </label>
        <label className="flex w-48 flex-col gap-1 text-sm font-semibold">
          {t("master:stock.from")}
          <Input value={from} onChange={change(setFrom)} placeholder="YYYY-MM-DD" inputMode="numeric" />
        </label>
        <label className="flex w-48 flex-col gap-1 text-sm font-semibold">
          {t("master:stock.to")}
          <Input value={to} onChange={change(setTo)} placeholder="YYYY-MM-DD" inputMode="numeric" />
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-destructive">
          {t("master:errors.LOAD_FAILED")}
        </p>
      ) : (
        <div className="border border-border bg-card" aria-busy={loading}>
          <Table data-stack>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">{t("master:stock.colDate")}</TableHead>
                <TableHead className="px-4">{t("master:stock.colMaterial")}</TableHead>
                <TableHead className="px-4">{t("master:stock.colLot")}</TableHead>
                <TableHead className="px-4">{t("master:stock.colType")}</TableHead>
                <TableHead className="px-4 text-right">{t("master:stock.colChange")}</TableHead>
                <TableHead className="px-4 text-right">{t("master:stock.colBalance")}</TableHead>
                <TableHead className="px-4">{t("master:stock.colOrder")}</TableHead>
                <TableHead className="px-4">{t("master:stock.colNote")}</TableHead>
                <TableHead className="px-4">{t("master:stock.colBy")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  // a click anywhere in the row opens the material (the links of the row do their own work)
                  onClick={(event) => !event.target.closest("a") && navigate(`/stock/materials/${row.materialId}`)}
                >
                  <TableCell data-label={t("master:stock.colDate")} className="px-4 py-3" title={formatDateTime(row.at, language)}>
                    {row.changeDate}
                  </TableCell>
                  <TableCell data-label={t("master:stock.colMaterial")} className="px-4 py-3">
                    <Link to={`/stock/materials/${row.materialId}`}>{row.materialCode}</Link> {row.materialName}
                  </TableCell>
                  <TableCell data-label={t("master:stock.colLot")} className="px-4 py-3">
                    {row.lotNumber}
                  </TableCell>
                  <TableCell data-label={t("master:stock.colType")} className="px-4 py-3">
                    {t(`master:stock.kinds.${row.kind}`)}
                  </TableCell>
                  <TableCell data-label={t("master:stock.colChange")} className="px-4 py-3 text-right">
                    {`${row.change > 0 ? "+" : ""}${formatNumber(row.change, language)}`}
                  </TableCell>
                  <TableCell data-label={t("master:stock.colBalance")} className="px-4 py-3 text-right">
                    {formatNumber(row.balance, language)}
                  </TableCell>
                  <TableCell data-label={t("master:stock.colOrder")} className="px-4 py-3">
                    {row.orderId ? <Link to={`/sale/orders/${row.orderId}`}>{row.orderNumber}</Link> : null}
                  </TableCell>
                  <TableCell data-label={t("master:stock.colNote")} className="px-4 py-3 whitespace-normal">
                    {row.note}
                  </TableCell>
                  <TableCell data-label={t("master:stock.colBy")} className="px-4 py-3">
                    {row.userName}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!loading && rows.length === 0 ? <p className="p-4 text-muted-foreground">{filtered ? t("master:stock.noMatch") : t("master:stock.noMovements")}</p> : null}
        </div>
      )}

      <Pagination page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
    </>
  );
}
