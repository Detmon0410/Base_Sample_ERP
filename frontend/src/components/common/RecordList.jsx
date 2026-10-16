import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { NativeSelect } from "@/components/common/FormFields";
import { Pagination } from "@/components/common/Pagination";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";

const PAGE_SIZE = 20;

/**
 * A list page: the title band, a search box, a status filter, a table with a bold header and thin lines, 20 rows a page
 * with Previous / Next. A click anywhere in a row opens its page (`${base}/${id}`); the first column
 * is also a link to it, for the keyboard. The rows alternate in colour.
 * `columns` is [{ key, header, cell?(row), numeric? }]; a `numeric` column (money, counts) is right-aligned, bold and its digits line up. The first column is the bold link of the row. A page with its own statuses (orders, invoices) gives `statusOptions` and `statusOf` and
 * gets the status filter and the status column at the end; master data has no status. `statusParam` is the query the filter sets (default `status`).
 */
export function RecordList({ api, base, title, columns, canCreate, newLabel, statusOptions, statusOf, statusParam = "status", above }) {
  const { t } = useTranslation(["master", "common"]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const withStatus = Boolean(statusOptions); // only the lists of orders and invoices have a status (their step in the workflow)

  const { data, error, loading } = useLoad(() => api.list({ q: q.trim() || undefined, [statusParam]: withStatus ? status || undefined : undefined, page, pageSize: PAGE_SIZE }), [q, status, page]);
  const rows = data?.items ?? [];
  const total = data?.meta?.total ?? 0;

  return (
    <>
      <PageHeader
        title={title}
        actions={
          canCreate ? (
            <Button asChild>
              <Link to={`${base}/new`}><Plus aria-hidden="true" />{newLabel}</Link>
            </Button>
          ) : null
        }
      />

      {above}

      <div className="mb-4 flex flex-wrap items-end gap-6">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-semibold">
          {t("master:list.search")}
          <Input
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setPage(1);
            }}
          />
        </label>
        {withStatus ? (
          <label className="flex w-48 flex-col gap-1 text-sm font-semibold">
            {t("master:list.status")}
            <NativeSelect
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              options={statusOptions}
            />
          </label>
        ) : null}
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
                {columns.map((column) => (
                  <TableHead key={column.key} className={column.numeric ? "px-4 text-right" : "px-4"}>
                    {column.header}
                  </TableHead>
                ))}
                {withStatus ? <TableHead className="px-4">{t("master:list.statusColumn")}</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  // a click anywhere in the row opens the record (the link of the first cell stays for the keyboard)
                  onClick={(event) => !event.target.closest("a") && navigate(`${base}/${row.id}`)}
                >
                  {columns.map((column, index) => {
                    const value = column.cell ? column.cell(row) : row[column.key];
                    return (
                      <TableCell key={column.key} data-label={column.header} className={column.numeric ? "px-4 py-3 text-right font-bold tabular-nums" : "px-4 py-3"}>
                        {index === 0 ? <Link to={`${base}/${row.id}`} className="font-semibold">{value || row.id}</Link> : value}
                      </TableCell>
                    );
                  })}
                  {withStatus ? (
                    <TableCell data-label={t("master:list.statusColumn")} className="px-4 py-3">
                      {statusOf(row)}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!loading && rows.length === 0 ? (
            <div className="flex flex-wrap items-center gap-4 p-4">
              <p className="text-muted-foreground">{q || status ? t("master:list.noMatch") : t("master:list.empty")}</p>
              {canCreate && !q && !status ? (
                <Button asChild size="sm">
                  <Link to={`${base}/new`}><Plus aria-hidden="true" />{newLabel}</Link>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      <Pagination page={page} setPage={setPage} total={total} pageSize={PAGE_SIZE} />
    </>
  );
}
