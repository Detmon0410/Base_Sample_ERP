import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const DEPARTMENT_STYLE = {
  Sale: { color: "#1447e6", labelKey: "groups.sale" },
  Factory: { color: "#0f766e", labelKey: "groups.factory" },
  Purchase: { color: "#b45309", labelKey: "groups.purchase" },
  Accounting: { color: "#be185d", labelKey: "groups.accounting" },
};

/** One KPI: department, label, big value, one line of context, link to the filtered list. */
export function KpiCard({ department, label, value, context, problem = false, to, canLink }) {
  const { t } = useTranslation(["nav", "dashboard"]);
  const style = DEPARTMENT_STYLE[department];

  const body = (
    <Card
      className={cn(
        "h-full transition-shadow",
        canLink && "hover:shadow-md",
        problem && "ring-1 ring-destructive/40",
      )}
    >
      <CardContent className="flex h-full flex-col gap-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: style.color }} />
          {t(`nav:${style.labelKey}`)}
        </p>
        <p className="text-base font-semibold">{label}</p>
        <p
          className={cn(
            "flex items-center gap-2 leading-tight font-bold",
            String(value).length > 7 ? "text-2xl" : "text-3xl",
            problem ? "text-destructive" : "text-foreground",
          )}
        >
          {problem ? <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" /> : null}
          {value}
        </p>
        <p className="mt-auto flex items-center justify-between gap-2 pt-2 text-sm text-muted-foreground">
          <span>{context}</span>
          {canLink ? <ArrowRightIcon className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
        </p>
      </CardContent>
    </Card>
  );

  if (canLink) {
    return (
      <Link to={to} className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {body}
      </Link>
    );
  }
  // No access to the target page: the number stays visible, the card is not a link.
  return <div title={t("dashboard:noLinkAccess")}>{body}</div>;
}

export function KpiCardSkeleton() {
  return (
    <Card aria-busy="true">
      <CardContent className="flex flex-col gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-4 w-36" />
      </CardContent>
    </Card>
  );
}
