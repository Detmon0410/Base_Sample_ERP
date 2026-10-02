import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Card used by every dashboard block. It owns the four states from the spec:
 * loading (skeleton of the final size), error (with Try again), empty, and ready.
 * status: "loading" | "error" | "empty" | "ready"
 */
export function BlockCard({ title, status, emptyText, onRetry, action, children, rows = 4 }) {
  const { t } = useTranslation("dashboard");

  return (
    <Card className="gap-4">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          {status === "ready" ? action : null}
        </div>

        {status === "loading" ? (
          <div className="flex flex-col gap-3" aria-busy="true">
            {Array.from({ length: rows }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : null}

        {status === "error" ? (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-lg bg-muted p-4">
            <p>{t("loadError")}</p>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              {t("retry")}
            </Button>
          </div>
        ) : null}

        {status === "empty" ? <p className="py-6 text-center text-muted-foreground">{emptyText}</p> : null}

        {status === "ready" ? children : null}
      </CardContent>
    </Card>
  );
}
