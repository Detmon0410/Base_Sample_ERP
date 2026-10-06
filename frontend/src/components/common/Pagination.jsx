import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAGE_SIZES } from "@/config/masterData";
import { formatNumber } from "@/utils/format";

/** Page numbers around the current page, e.g. 1 … 4 5 6 … 12 */
function pageWindow(page, pages) {
  const set = new Set([1, pages, page - 1, page, page + 1]);
  const numbers = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  numbers.forEach((n, index) => {
    if (index > 0 && n - numbers[index - 1] > 1) out.push("gap");
    out.push(n);
  });
  return out;
}

/** "Showing 1–20 of 134" and numbered buttons, all text buttons of at least 40px. */
export function Pagination({ page, pageSize, total, onChange, onPageSizeChange }) {
  const { t, i18n } = useTranslation("common");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {onPageSizeChange ? (
          <label className="flex items-center gap-2 text-muted-foreground">
            {t("pagination.show")}
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger className="h-9 w-20" aria-label={t("pagination.perPage")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" align="start">
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        ) : null}
      <p className="text-muted-foreground">
        {total === 0
          ? t("pagination.none")
          : t("pagination.showing", {
              from: formatNumber(from, i18n.language),
              to: formatNumber(to, i18n.language),
              total: formatNumber(total, i18n.language),
            })}
      </p>
      </div>

      {pages > 1 ? (
        <nav aria-label={t("pagination.label")} className="flex items-center gap-1">
          <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
            <ChevronLeftIcon /> {t("pagination.previous")}
          </Button>
          {pageWindow(page, pages).map((item, index) =>
            item === "gap" ? (
              <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                size="sm"
                variant={item === page ? "default" : "ghost"}
                className="min-w-10"
                aria-label={t("pagination.page", { page: item })}
                aria-current={item === page ? "page" : undefined}
                onClick={() => onChange(item)}
              >
                {item}
              </Button>
            ),
          )}
          <Button type="button" variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
            {t("pagination.next")} <ChevronRightIcon />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
