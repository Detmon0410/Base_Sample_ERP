import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";

import { CardList } from "@/components/common/CardList";
import { Button } from "@/components/ui/button";
import { usePhone } from "@/hooks/useNarrow";
import { Skeleton } from "@/components/ui/skeleton";
import { useRowSeen } from "@/utils/rowSeen";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Server-side table: the parent owns sort, page and data.
 * columns: [{ key, header, sortable?, align?: "right" | "center", width?: "w-40" (class of the header cell), render?(row), className? }]
 * sort: "code" (ascending) or "-code" (descending). status: "loading" | "ready" | "error".
 * A column with `secondary: true` is hidden below 1280 px (a tablet, held upright or sideways, docs/specs/f15-tablet.md).
 * Last row (summary): "Total N items" under the first column(s), and under every column that has `sum` the sum
 * the server sent for it. `total` = number of records of the whole list (all pages), `sums` = { [column key]: value }
 * for the whole list; a column says how to show its sum with `sum: (value) => node`.
 * A click on a row opens `rowTo(row)`; links and buttons inside a row keep their own action. The first column
 * (when it has no `render`) is a link to the same place, for the keyboard.
 */
export function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  sort,
  onSortChange,
  rowTo,
  status,
  fetching = false,
  onRetry,
  emptyContent,
  total,
  sums,
  ariaLabel,
  skeletonRows = 8,
}) {
  const { t } = useTranslation("master");
  const navigate = useNavigate();
  const rowSeen = useRowSeen(); // a red dot on the rows that are new for this user
  const phone = usePhone(); // on a phone the rows are cards (docs/specs/f16-mobile.md)
  const sortField = sort?.startsWith("-") ? sort.slice(1) : sort;
  const descending = sort?.startsWith("-");

  const ariaSort = (column) =>
    column.sortable && sortField === column.key ? (descending ? "descending" : "ascending") : undefined;

  // The label spans the columns before the first column that has a sum (or all of them when none has).
  const firstSum = columns.findIndex((column) => column.sum && sums?.[column.key] != null);
  const labelSpan = firstSum === -1 ? columns.length : Math.max(1, firstSum);

  const onRowClick = (event, row) => {
    if (rowTo) rowSeen.mark(rowTo(row)); // opening a row (also with its link) makes its dot go away
    if (!rowTo || event.target.closest("a,button")) return;
    navigate(rowTo(row));
  };

  if (phone) {
    return (
      <CardList
        columns={columns}
        rows={rows}
        rowKey={rowKey}
        sort={sort}
        onSortChange={onSortChange}
        rowTo={rowTo}
        status={status}
        fetching={fetching}
        onRetry={onRetry}
        emptyContent={emptyContent}
        total={total}
        ariaLabel={ariaLabel}
        isNew={rowSeen.isNew}
        mark={rowSeen.mark}
        skeletonRows={skeletonRows}
      />
    );
  }

  return (
    <div
      className={cn("overflow-hidden rounded-lg border border-slate-200 bg-card transition-opacity", fetching && "opacity-60")}
      aria-busy={fetching}
    >
      <Table aria-label={ariaLabel}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={column.key}
                aria-sort={ariaSort(column)}
                className={cn("h-11 px-3 text-sm font-semibold text-[#4C4C4C]", column.align === "right" && "text-right", column.align === "center" && "text-center", column.secondary && "max-[1279px]:hidden", column.width)}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-10 items-center gap-1.5 rounded-md px-1 outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
                      column.align === "right" && "flex-row-reverse",
                    )}
                    onClick={() => onSortChange(sortField === column.key && !descending ? `-${column.key}` : column.key)}
                  >
                    {column.header}
                    {sortField === column.key ? (
                      descending ? (
                        <ArrowDownIcon className="size-4 text-primary" aria-hidden="true" />
                      ) : (
                        <ArrowUpIcon className="size-4 text-primary" aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {status === "loading"
            ? Array.from({ length: skeletonRows }, (_, index) => (
                <TableRow key={index}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className="px-3 py-2">
                      <Skeleton className="h-6 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}

          {status === "error" ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="px-3 py-10">
                <div role="alert" className="flex flex-col items-center gap-3">
                  <p>{t("common.loadError")}</p>
                  <Button type="button" variant="outline" onClick={onRetry}>
                    {t("common.retry")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : null}

          {status === "ready" && rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="px-3 py-12 text-center text-muted-foreground">
                {emptyContent}
              </TableCell>
            </TableRow>
          ) : null}

          {status === "ready"
            ? rows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  onClick={(event) => onRowClick(event, row)}
                  className={cn(rowTo && "cursor-pointer")}
                >
                  {columns.map((column, index) => {
                    const content = column.render ? column.render(row) : row[column.key];
                    return (
                      <TableCell
                        key={column.key}
                        className={cn("px-3 py-2", column.align === "right" && "text-right", column.align === "center" && "text-center", column.secondary && "max-[1279px]:hidden", column.className)}
                      >
                        <span className="inline-flex items-center gap-2">
                          {index === 0 && rowTo && rowSeen.isNew(row, rowTo(row)) ? (
                            <span role="img" aria-label={t("common.newRow")} title={t("common.newRow")} className="size-2.5 shrink-0 rounded-full bg-red-600" />
                          ) : null}
                          {/* the first column is also a real link, so a row can be opened with the keyboard */}
                          {index === 0 && rowTo && !column.render ? (
                            <Link to={rowTo(row)} className="rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
                              {content}
                            </Link>
                          ) : (
                            content
                          )}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            : null}
        </TableBody>
        {status === "ready" && rows.length > 0 && total != null ? (
          <TableFooter>
            <TableRow className="bg-slate-100 odd:bg-slate-100 even:bg-slate-100 hover:bg-slate-100">
              <TableCell colSpan={labelSpan} className="px-3 py-3 font-bold text-slate-900">
                {t("common.totalItems", { count: total })}
              </TableCell>
              {columns.slice(labelSpan).map((column) => (
                <TableCell key={column.key} className={cn("px-3 py-3 font-bold text-slate-900", column.align === "right" && "text-right", column.secondary && "max-[1279px]:hidden")}>
                  {column.sum && sums?.[column.key] != null ? column.sum(sums[column.key]) : null}
                </TableCell>
              ))}
            </TableRow>
          </TableFooter>
        ) : null}
      </Table>
    </div>
  );
}
