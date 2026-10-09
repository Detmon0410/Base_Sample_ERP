import { useTranslation } from "react-i18next";

import { Skeleton } from "@/components/ui/skeleton";

/** Shown in the main area while the file of a page is being loaded (the header stays). */
export function RouteLoading() {
  const { t } = useTranslation();
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-4 p-1">
      <span className="sr-only">{t("loading")}</span>
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
