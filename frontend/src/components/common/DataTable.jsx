import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * Server-side table: the parent owns sort, page and data.
 * columns: [{ key, header, sortable?, align?: "right", render?(row), className? }]
 * sort: "code" (ascending) or "-code" (descending). status: "loading" | "ready" | "error".
 * A click on a row opens `rowTo(row)`; links and buttons inside a row keep their own action.
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
  ariaLabel,
  skeletonRows = 8,
}) {
  const { t } = useTranslation("master");
  const navigate = useNavigate();
  const sortField = sort?.startsWith("-") ? sort.slice(1) : sort;
  const descending = sort?.startsWith("-");

  const ariaSort = (column) =>
    column.sortable && sortField === column.key ? (descending ? "descending" : "ascending") : undefined;

  const onRowClick = (event, row) => {
    if (!rowTo || event.target.closest("a,button")) return;
    navigate(rowTo(row));
  };

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
                className={cn("h-11 px-3 text-sm font-semibold text-[#4C4C4C]", column.align === "right" && "text-right")}
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
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn("px-3 py-2", column.align === "right" && "text-right", column.className)}
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
        </TableBody>
      </Table>
    </div>
  );
}
