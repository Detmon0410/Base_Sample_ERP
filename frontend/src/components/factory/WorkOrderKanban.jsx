import { ClockAlertIcon, CogIcon, PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { ActionDialog } from "@/components/documents/ActionDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { canWork, WORK_ORDER_STATUSES, workOrderActions } from "@/config/factory";
import { STATUS_COLORS } from "@/config/sale";
import { useAuth } from "@/hooks/useAuth";
import { listWaitingOrders, workOrderService } from "@/services/factory.service";
import { cn } from "@/lib/utils";
import { formatDate, formatNumber } from "@/utils/format";
import { notifyMasterChanged, onRefresh } from "@/utils/masterEvents";

// Dropping a card on another column does what the status button of the sheet does. Any other move is refused.
const MOVES = {
  "draft>scheduled": "schedule",
  "scheduled>draft": "back-to-draft",
  "scheduled>in_process": "start",
  "in_process>finished": "finish",
};

// A column that keeps growing (finished, cancelled) shows the newest few and a button for the rest.
const SHOWN_IN_LONG_COLUMN = { finished: 5, cancelled: 3 };

function KanbanCard({ wo, to, onDragStart, onDragEnd, dragging }) {
  const { t, i18n } = useTranslation("factory");
  const language = i18n.language;
  const { progress } = wo;
  const current = progress.currentStep;

  return (
    <Link
      to={to}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(wo.id));
        event.dataTransfer.effectAllowed = "move";
        onDragStart(wo);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "relative block overflow-hidden rounded-lg bg-card p-3 shadow-[0_1px_2px_rgba(15,23,42,0.08),0_2px_8px_-2px_rgba(15,23,42,0.14)] outline-none transition hover:shadow-[0_2px_4px_rgba(15,23,42,0.1),0_8px_16px_-4px_rgba(15,23,42,0.22)] focus-visible:ring-2 focus-visible:ring-ring",
        dragging && "opacity-40",
        wo.status === "cancelled" && "opacity-70",
      )}
    >
      <p className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-base font-bold text-slate-900">{wo.productName}</span>
        <span className="shrink-0 text-sm font-bold text-slate-900">
          {formatNumber(wo.qty, language)} <span className="font-normal text-muted-foreground">{wo.uom}</span>
        </span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-700">{wo.number}</span>
        <span className={cn("flex items-center gap-1 truncate", progress.late ? "font-semibold text-amber-700" : "text-muted-foreground")}>
          {progress.late ? <ClockAlertIcon className="size-4 shrink-0" aria-hidden="true" /> : null}
          {progress.late ? t("card.lateDays", { count: progress.lateDays }) : wo.planFinish ? formatDate(wo.planFinish, language) : t("card.noPlan")}
        </span>
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.stepsTotal}
          aria-valuenow={progress.stepsDone}
          aria-label={t("card.stepsDone", { done: progress.stepsDone, total: progress.stepsTotal })}
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200"
        >
          <div
            className={cn("h-full rounded-full", wo.status === "finished" ? "bg-success" : progress.late ? "bg-amber-500" : "bg-primary")}
            style={{ width: `${progress.stepsTotal ? Math.round((progress.stepsDone / progress.stepsTotal) * 100) : 0}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-700">
          {progress.stepsDone}/{progress.stepsTotal}
        </span>
      </div>
      {wo.status === "in_process" && current ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-700">
          <CogIcon className="size-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="truncate">{current.processName}</span>
        </p>
      ) : null}
    </Link>
  );
}

/** A sales order line that waits for a work order: what is left, for whom, and the button that makes the work order. */
function WaitingCard({ order, line, canCreate, onCreate, onDragStart, onDragEnd, dragging }) {
  const { t, i18n } = useTranslation("factory");
  const language = i18n.language;
  return (
    <div
      draggable={canCreate}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", `${order.id}:${line.productId}`);
        event.dataTransfer.effectAllowed = "move";
        onDragStart({ waitingLine: true, order, line });
      }}
      onDragEnd={onDragEnd}
      className={cn("relative overflow-hidden rounded-lg border border-dashed border-slate-300 bg-card py-3 pr-3 pl-4", dragging && "opacity-40")}
    >
      <p className="flex items-baseline justify-between gap-2">
        <span className="min-w-0 truncate text-base font-bold text-slate-900">{line.productName}</span>
        <span className="shrink-0 text-sm font-bold text-amber-700">
          {formatNumber(line.remaining, language)} <span className="font-normal text-muted-foreground">/ {formatNumber(line.qty, language)} {line.uom}</span>
        </span>
      </p>
      <p className="mt-1 flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-semibold text-slate-700">{order.number}</span>
        <span className="shrink-0 text-muted-foreground">{order.deliveryDate ? t("waiting.delivery", { date: formatDate(order.deliveryDate, language) }) : ""}</span>
      </p>
      <p className="truncate text-sm text-muted-foreground">{order.customerName}</p>
      {canCreate ? (
        <Button type="button" size="sm" className="mt-2 h-9 w-full" onClick={() => onCreate(order, line)}>
          <PlusIcon aria-hidden="true" /> {t("waiting.create")}
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Work orders as a kanban board: one column per status, a card per work order. A card can be dragged to another
 * column to do the status step (Schedule, Start, Finish, back to draft): a dialog asks to confirm, like the buttons of
 * the sheet, and a move that is not allowed says why. Everything also works without dragging: a card opens the sheet.
 * The first column is "Waiting for a work order": the sales order lines that Sale sent to the factory and that have no
 * work order yet; its button (or dropping the card on Draft) opens a new work order with the line filled in.
 */
export function WorkOrderKanban({ items, status, onRetry, to }) {
  const { t } = useTranslation("factory");
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(null); // the work order (or the waiting order line) being dragged
  const [waiting, setWaiting] = useState([]); // the sales orders that wait for a work order: the first column
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => onRefresh(() => setReloadKey((key) => key + 1)), []);
  useEffect(() => {
    let cancelled = false;
    listWaitingOrders()
      .then((orders) => !cancelled && setWaiting(orders))
      .catch(() => !cancelled && setWaiting([]));
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);
  const waitingLines = useMemo(() => waiting.flatMap((order) => order.lines.map((line) => ({ order, line }))), [waiting]);
  const createFrom = (order, line) => navigate("/factory/work-orders/new", { state: { saleOrderId: order.id, productId: line.productId, qty: line.remaining } });
  const [over, setOver] = useState(null); // the column the card is over
  const [pending, setPending] = useState(null); // { wo, action } waiting for the confirmation
  const [expanded, setExpanded] = useState(() => new Set()); // the long columns that show everything

  const byStatus = useMemo(
    () =>
      Object.fromEntries(
        WORK_ORDER_STATUSES.map((key) => {
          const rows = items.filter((wo) => wo.status === key);
          // the long columns: the newest first
          return [key, SHOWN_IN_LONG_COLUMN[key] ? [...rows].sort((a, b) => String(b.planFinish ?? "").localeCompare(String(a.planFinish ?? "")) || b.id - a.id) : rows];
        }),
      ),
    [items],
  );
  const allowedTargets = useMemo(
    () => new Set(dragging?.waitingLine ? (canWork(user) ? ["draft"] : []) : dragging ? WORK_ORDER_STATUSES.filter((target) => MOVES[`${dragging.status}>${target}`] && workOrderActions(dragging, user).some((action) => action.key === MOVES[`${dragging.status}>${target}`])) : []),
    [dragging, user],
  );

  const drop = (target) => {
    const wo = dragging;
    setDragging(null);
    setOver(null);
    if (wo?.waitingLine) {
      // a waiting order line dropped on Draft makes a new work order for it
      if (target === "draft" && canWork(user)) createFrom(wo.order, wo.line);
      else toast.error(t("kanban.dropWaiting"));
      return;
    }
    if (!wo || wo.status === target) return;
    const key = MOVES[`${wo.status}>${target}`];
    const action = key && workOrderActions(wo, user).find((item) => item.key === key);
    if (!action) {
      toast.error(t(key ? "kanban.notAllowedRole" : "kanban.notAllowed", { from: t(`status.${wo.status}`, { ns: "sale" }), to: t(`status.${target}`, { ns: "sale" }) }));
      return;
    }
    if (key === "schedule" && !(wo.planStart && wo.planFinish)) {
      toast.error(t("kanban.needDates"));
      return;
    }
    setPending({ wo, action });
  };

  const run = async (note) => {
    try {
      await workOrderService.run(pending.wo.id, pending.action.key, { note });
      toast.success(t(`actions.${pending.action.key}.done`));
      notifyMasterChanged();
    } catch (error) {
      toast.error(t(`errors.${error?.code}`, { defaultValue: t("errors.UNKNOWN") }));
      throw error;
    }
  };

  if (status === "loading") {
    return (
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5" aria-busy="true">
        {WORK_ORDER_STATUSES.map((key) => (
          <Skeleton key={key} className="h-72 rounded-xl" />
        ))}
      </div>
    );
  }
  if (status === "error") {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 px-3 py-10">
        <p>{t("master:common.loadError")}</p>
        <Button type="button" variant="outline" onClick={onRetry}>
          {t("master:common.retry")}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-x-auto px-3 pb-3">
        <div className="flex h-full gap-3">
          <section aria-label={t("waiting.title")} className="flex min-h-0 min-w-88 flex-1 flex-col rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
            <h2 className="relative flex items-center gap-2 px-3 pt-3 pb-2 text-base font-bold">
              <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1.5 rounded-t-xl bg-slate-400" />
              <span className="min-w-0 flex-1 truncate text-slate-900">{t("waiting.title")}</span>
              <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-sm font-semibold text-slate-700">{waitingLines.length}</span>
            </h2>
            <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 pt-1">
              {waitingLines.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-muted-foreground">{t("waiting.none")}</li>
              ) : (
                waitingLines.map(({ order, line }) => (
                  <li key={`${order.id}-${line.productId}`}>
                    <WaitingCard
                      order={order}
                      line={line}
                      canCreate={canWork(user)}
                      onCreate={createFrom}
                      onDragStart={setDragging}
                      onDragEnd={() => (setDragging(null), setOver(null))}
                      dragging={dragging?.waitingLine && dragging.order.id === order.id && dragging.line.productId === line.productId}
                    />
                  </li>
                ))
              )}
            </ul>
          </section>

          {WORK_ORDER_STATUSES.map((key) => {
            const color = STATUS_COLORS[key];
            const cards = byStatus[key];
            const limit = SHOWN_IN_LONG_COLUMN[key];
            const folded = limit && cards.length > limit && !expanded.has(key);
            const shown = folded ? cards.slice(0, limit) : cards;
            const allowed = allowedTargets.has(key);
            return (
              <section
                key={key}
                aria-label={t(`status.${key}`, { ns: "sale" })}
                onDragOver={(event) => {
                  if (!dragging) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = allowed ? "move" : "none";
                  setOver(key);
                }}
                onDragLeave={() => setOver((current) => (current === key ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  drop(key);
                }}
                className={cn(
                  "flex min-h-0 min-w-88 flex-1 flex-col rounded-xl bg-slate-50 transition-colors",
                  dragging && allowed && "ring-2 ring-primary/40",
                  dragging && over === key && allowed && "bg-secondary ring-primary",
                  dragging && over === key && !allowed && dragging.status !== key && "ring-2 ring-destructive/40",
                )}
              >
                <h2 className="relative flex items-center gap-2 px-3 pt-3 pb-2 text-base font-bold">
                  <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-1.5 rounded-t-xl", color.solid)} />
                  <span className="min-w-0 flex-1 truncate text-slate-900">{t(`status.${key}`, { ns: "sale" })}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-semibold", color.soft)}>{cards.length}</span>
                </h2>
                <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 pt-1">
                  {cards.length === 0 ? (
                    <li className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-muted-foreground">{t("kanban.emptyColumn")}</li>
                  ) : (
                    shown.map((wo) => (
                      <li key={wo.id}>
                        <KanbanCard wo={wo} to={to(wo)} dragging={dragging?.id === wo.id} onDragStart={setDragging} onDragEnd={() => (setDragging(null), setOver(null))} />
                      </li>
                    ))
                  )}
                  {limit && cards.length > limit ? (
                    <li>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 w-full text-primary"
                        onClick={() =>
                          setExpanded((current) => {
                            const next = new Set(current);
                            if (next.has(key)) next.delete(key);
                            else next.add(key);
                            return next;
                          })
                        }
                      >
                        {folded ? t("kanban.showAll", { count: cards.length }) : t("kanban.showFewer")}
                      </Button>
                    </li>
                  ) : null}
                </ul>
              </section>
            );
          })}
        </div>
      </div>

      {pending ? (
        <ActionDialog
          open
          onOpenChange={(open) => !open && setPending(null)}
          title={t(`actions.${pending.action.key}.title`)}
          description={`${pending.wo.number} · ${t(`actions.${pending.action.key}.description`)}`}
          confirmLabel={t(`actions.${pending.action.key}.confirm`)}
          noteMode={pending.action.noteLabel}
          danger={pending.action.danger}
          onConfirm={run}
        />
      ) : null}
    </>
  );
}
