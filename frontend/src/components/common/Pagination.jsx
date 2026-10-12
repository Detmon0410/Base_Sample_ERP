import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

/** "Showing 1-20 of 45" with Previous / Next (docs/specs/s2-mini-erp-look.md). */
export function Pagination({ page, setPage, total, pageSize }) {
  const { t } = useTranslation("common");
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav aria-label={t("pagination.label")} className="mt-4 flex flex-wrap items-center gap-4">
      <span className="text-muted-foreground">{total === 0 ? t("pagination.none") : t("pagination.showing", { from, to, total })}</span>
      <span className="ml-auto flex gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          {t("pagination.previous")}
        </Button>
        <Button variant="outline" size="sm" disabled={to >= total} onClick={() => setPage(page + 1)}>
          {t("pagination.next")}
        </Button>
      </span>
    </nav>
  );
}
