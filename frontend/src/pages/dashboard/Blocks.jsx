import { ArrowRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { StatusBadge } from "@/components/common/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { canUse } from "@/utils/permissions";
import { formatCurrency, formatDate, formatDateTime, formatNumber, formatTime } from "@/utils/format";

import { BlockCard } from "./BlockCard";
import { blockStatus } from "./blockStatus";

// Where a document type opens (detail page = base + "/" + id).
const DOCUMENT_BASE = {
  QT: "/sale/quotations",
  SO: "/sale/orders",
  WO: "/factory/work-orders",
  PO: "/purchase/orders",
  INVOICE: "/accounting/invoices",
  BILL: "/accounting/bills",
};

export function ApprovalsBlock({ items, hasError, loading, onRetry }) {
  const { t, i18n } = useTranslation("dashboard");
  const status = blockStatus({ loading, hasError, items });

  return (
    <BlockCard title={t("approvals.title")} status={status} emptyText={t("approvals.empty")} onRetry={onRetry}>
      <ul className="flex flex-col divide-y">
        {items?.map((item) => (
          <li key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2">
                <Badge variant="secondary" className="h-6 text-sm">{t(`approvals.types.${item.type}`)}</Badge>
                <span className="font-semibold">{item.number}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {item.party}
                {item.amountJpy != null ? ` · ${formatCurrency(item.amountJpy, i18n.language)}` : ""}
                {` · ${formatDate(item.createdAt, i18n.language)}`}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to={`${DOCUMENT_BASE[item.type] ?? "/"}/${item.id}`}>{t("approvals.open")}</Link>
            </Button>
          </li>
        ))}
      </ul>
    </BlockCard>
  );
}

/** Workers do not approve anything, so they see their own recent documents instead. */
export function MyRecentBlock({ items, hasError, loading, onRetry }) {
  const { t, i18n } = useTranslation("dashboard");
  const status = blockStatus({ loading, hasError, items });

  return (
    <BlockCard title={t("myRecent.title")} status={status} emptyText={t("myRecent.empty")} onRetry={onRetry}>
      <ul className="flex flex-col divide-y">
        {items?.map((item) => (
          <li key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-4 py-3">
            <p className="flex items-center gap-2">
              <Badge variant="secondary" className="h-6 text-sm">{t(`approvals.types.${item.type}`)}</Badge>
              <span className="font-semibold">{item.number}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {item.status} · {formatDateTime(item.at, i18n.language)}
            </p>
          </li>
        ))}
      </ul>
    </BlockCard>
  );
}

export function StockAlertsBlock({ items, hasError, loading, onRetry }) {
  const { t, i18n } = useTranslation("dashboard");
  const { user } = useAuth();
  const status = blockStatus({ loading, hasError, items });
  const canOpenBoard = canUse(user, { type: "departments", departments: ["Purchase"] });

  return (
    <BlockCard
      title={t("stockAlerts.title")}
      status={status}
      emptyText={t("stockAlerts.empty")}
      onRetry={onRetry}
      action={
        canOpenBoard ? (
          <Button asChild variant="link" size="sm" className="px-0">
            <Link to="/purchase/stock-status">
              {t("stockAlerts.viewAll")} <ArrowRightIcon />
            </Link>
          </Button>
        ) : null
      }
    >
      <Table className="[&_td]:px-1.5 [&_th]:px-1.5">
        <TableHeader>
          <TableRow>
            <TableHead>{t("stockAlerts.material")}</TableHead>
            <TableHead className="text-right whitespace-normal">{t("stockAlerts.quantity")}</TableHead>
            <TableHead>{t("stockAlerts.status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((item) => (
            <TableRow key={item.materialId}>
              <TableCell className="font-semibold">
                {item.name}
                <span className="block text-sm font-normal text-muted-foreground">{item.code}</span>
              </TableCell>
              <TableCell className="text-right">
                <span className="font-semibold">{formatNumber(item.qtyOnHand, i18n.language)}</span>
                {" / "}
                {formatNumber(item.reorderPoint, i18n.language)} {item.uom}
              </TableCell>
              <TableCell>
                <StatusBadge tone={item.status === "SHORTAGE" ? "danger" : "warning"}>
                  {t(`stockAlerts.statuses.${item.status}`)}
                </StatusBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </BlockCard>
  );
}

export function ProductionBlock({ items, hasError, loading, onRetry }) {
  const { t, i18n } = useTranslation("dashboard");
  const status = blockStatus({ loading, hasError, items });

  return (
    <BlockCard title={t("production.title")} status={status} emptyText={t("production.empty")} onRetry={onRetry}>
      <ul className="flex flex-col divide-y">
        {items?.map((item) => {
          const percent = item.stepsTotal ? Math.round((item.stepsDone / item.stepsTotal) * 100) : 0;
          return (
            <li key={item.woId} className="flex flex-col gap-2 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">
                  {item.number}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {item.product} · {t("production.qty", { qty: formatNumber(item.qty, i18n.language) })}
                  </span>
                </p>
                {item.late ? <StatusBadge tone="danger">{t("production.late")}</StatusBadge> : null}
              </div>
              <Progress value={percent} aria-label={`${item.number} ${percent}%`} />
              <p className="flex justify-between text-sm text-muted-foreground">
                <span>{t("production.steps", { done: item.stepsDone, total: item.stepsTotal })}</span>
                <span>{t("production.planFinish", { date: formatDate(item.planFinish, i18n.language) })}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </BlockCard>
  );
}

export function ActivityBlock({ items, hasError, loading, onRetry }) {
  const { t, i18n } = useTranslation("dashboard");
  const status = blockStatus({ loading, hasError, items });

  return (
    <BlockCard title={t("activity.title")} status={status} emptyText={t("activity.empty")} onRetry={onRetry} rows={6}>
      <ul className="flex flex-col divide-y">
        {items?.map((item, index) => (
          <li key={`${item.number}-${index}`} className="flex items-start justify-between gap-4 py-2.5">
            <p>
              <span className="font-semibold">{item.number}</span> · {item.action}
              <span className="block text-sm text-muted-foreground">{t("activity.by", { user: item.user })}</span>
            </p>
            <time dateTime={item.at} className="shrink-0 text-sm text-muted-foreground">
              {formatTime(item.at, i18n.language)}
            </time>
          </li>
        ))}
      </ul>
    </BlockCard>
  );
}
