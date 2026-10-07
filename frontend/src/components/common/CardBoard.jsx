import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

/**
 * A grid of cards: the "board" way of showing a list (Work Orders; Stock and Purchase can use it later).
 * It handles the loading skeletons, the error with Retry, the empty content and the dimming while a new page is
 * loading, so every board behaves like the tables do. 1 card per row on a narrow window, 2 from 640px, 3 from
 * 1280px.
 *   items  the rows       renderCard(item) -> node        status "loading" | "ready" | "error"
 */
export function CardBoard({ items, renderCard, status, fetching = false, onRetry, emptyContent, skeletons = 6, label, className }) {
  const { t } = useTranslation("master");

  if (status === "loading") {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {Array.from({ length: skeletons }, (_, index) => (
          <Skeleton key={index} className="h-56 rounded-xl" />
        ))}
      </div>
    );
  }
  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 px-3 py-10">
        <p>{t("common.loadError")}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }
  if (items.length === 0) return <div className="rounded-lg border border-slate-200 py-8">{emptyContent}</div>;

  return (
    <ul aria-label={label} aria-busy={fetching} className={cn("grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3", fetching && "opacity-60", className)}>
      {items.map((item) => (
        <li key={item.id} className="min-w-0">
          {renderCard(item)}
        </li>
      ))}
    </ul>
  );
}
