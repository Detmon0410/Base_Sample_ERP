import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * The rows of a table as cards, for a phone (docs/specs/f16-mobile.md). Same props as DataTable.
 *   first column      the title of the card (a link to the row)
 *   column "status"   at the right of the title
 *   other columns     "label  value" lines; a column with \`secondary: true\` is left out
 * Sorting is a plain list above the cards; the sums of the table are not shown, only the total number of items.
 */
export function CardList({ columns, rows, rowKey, sort, onSortChange, rowTo, status, fetching, onRetry, emptyContent, total, ariaLabel, isNew, mark, skeletonRows = 5 }) {
  const { t } = useTranslation("master");
  const [first, ...rest] = columns;
  const statusColumn = rest.find((column) => column.key === "status");
  const lines = rest.filter((column) => column !== statusColumn && !column.secondary);
  const sortable = columns.filter((column) => column.sortable);
  const valueOf = (column, row) => (column.render ? column.render(row) : row[column.key]);

  if (status === "loading") {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {Array.from({ length: skeletonRows }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-md" />
        ))}
      </div>
    );
  }
  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-8">
        <p>{t("common.loadError")}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }
  if (rows.length === 0) return <div className="py-8 text-center text-muted-foreground">{emptyContent}</div>;

  return (
    <div className={cn("flex flex-col gap-3 transition-opacity", fetching && "opacity-60")} aria-busy={fetching}>
      {sortable.length > 0 && onSortChange ? (
        <label className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          {t("common.sortBy")}
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value)}
            className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-base font-normal text-foreground"
          >
            {sortable.flatMap((column) => [
              <option key={column.key} value={column.key}>
                {column.header} ↑
              </option>,
              <option key={`-${column.key}`} value={`-${column.key}`}>
                {column.header} ↓
              </option>,
            ])}
          </select>
        </label>
      ) : null}

      <ul aria-label={ariaLabel} className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row) => {
          const title = valueOf(first, row);
          const key = rowKey(row);
          const titleId = `card-title-${key}`;
          const body = (
            <>
              <span className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-lg font-semibold text-slate-900">
                  {rowTo && isNew?.(row, rowTo(row)) ? <span role="img" aria-label={t("common.newRow")} className="size-2.5 shrink-0 rounded-full bg-red-600" /> : null}
                  <span id={titleId} className="min-w-0 break-words">{title}</span>
                </span>
                {statusColumn ? <span className="shrink-0">{valueOf(statusColumn, row)}</span> : null}
              </span>
              {lines.length > 0 ? (
                <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-base">
                  {lines.map((column) => (
                    <div key={column.key} className="contents">
                      <dt className="text-sm font-semibold text-muted-foreground">{column.header}</dt>
                      <dd className={cn("m-0 min-w-0 break-words", column.align === "right" && "text-right")}>{valueOf(column, row) ?? "—"}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </>
          );
          // The whole card opens the row. The link is laid over the card (not around it), because the cells may hold links of their
          // own (a document number, a product) and a link inside a link is invalid HTML. Links and buttons of the cells stay clickable.
          return (
            <li key={key} className="relative rounded-md border border-slate-300 bg-card">
              {rowTo ? (
                <Link to={rowTo(row)} onClick={() => mark?.(rowTo(row))} aria-labelledby={titleId} className="absolute inset-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              ) : null}
              <div className={cn("p-3", rowTo && "pointer-events-none min-h-12 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_a]:relative [&_button]:relative")}>{body}</div>
            </li>
          );
        })}
      </ul>

      {total != null ? <p className="m-0 text-sm font-semibold text-slate-900">{t("common.totalItems", { count: total })}</p> : null}
    </div>
  );
}
