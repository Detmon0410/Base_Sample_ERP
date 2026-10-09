import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { NativeSelect } from "@/components/common/FormFields";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLoad } from "@/hooks/useLoad";

const PAGE_SIZE = 20;

/**
 * A list page: the title band, a search box, a status filter, a table with a bold header and thin lines, 20 rows a page
 * with Previous / Next (docs/specs/s2-mini-erp-look.md). The first column of a row is the link to its page (`${base}/${id}`).
 * `columns` is [{ key, header, cell?(row) }]; the status column is added at the end.
 */
export function RecordList({ api, base, title, columns, canCreate, newLabel, statusOptions, statusOf }) {
  const { t } = useTranslation(["master", "common"]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, error, loading } = useLoad(() => api.list({ q: q.trim() || undefined, status: status || undefined, page, pageSize: PAGE_SIZE }), [q, status, page]);
  const rows = data?.items ?? [];
  const total = data?.meta?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <PageHeader
        title={title}
        actions={
          canCreate ? (
            <Button asChild>
              <Link to={`${base}/new`}>{newLabel}</Link>
            </Button>
          ) : null
        }
      />

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
        <label className="flex w-48 flex-col gap-1 text-sm font-semibold">
          {t("master:list.status")}
          <NativeSelect
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            options={statusOptions ?? [
              { value: "", label: t("master:list.all") },
              { value: "active", label: t("master:status.active") },
              { value: "inactive", label: t("master:status.inactive") },
            ]}
          />
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
                {columns.map((column) => (
                  <TableHead key={column.key} className="px-4">
                    {column.header}
                  </TableHead>
                ))}
                <TableHead className="px-4">{t("master:list.statusColumn")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((column, index) => {
                    const value = column.cell ? column.cell(row) : row[column.key];
                    return (
                      <TableCell key={column.key} data-label={column.header} className="px-4 py-3">
                        {index === 0 ? <Link to={`${base}/${row.id}`}>{value || row.id}</Link> : value}
                      </TableCell>
                    );
                  })}
                  <TableCell data-label={t("master:list.statusColumn")} className="px-4 py-3">
                    {statusOf ? statusOf(row) : t(`master:status.${row.status}`)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!loading && rows.length === 0 ? <p className="p-4 text-muted-foreground">{q || status ? t("master:list.noMatch") : t("master:list.empty")}</p> : null}
        </div>
      )}

      <nav aria-label={t("common:pagination.label")} className="mt-4 flex flex-wrap items-center gap-4">
        <span className="text-muted-foreground">{total === 0 ? t("common:pagination.none") : t("common:pagination.showing", { from, to, total })}</span>
        <span className="ml-auto flex gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            {t("common:pagination.previous")}
          </Button>
          <Button variant="outline" size="sm" disabled={to >= total} onClick={() => setPage(page + 1)}>
            {t("common:pagination.next")}
          </Button>
        </span>
      </nav>
    </>
  );
}
