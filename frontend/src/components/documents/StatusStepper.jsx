import { BanIcon, CalendarCheckIcon, CheckIcon, CircleCheckBigIcon, CircleCheckIcon, FileCheck2Icon, PackageOpenIcon, HourglassIcon, ClockIcon, CogIcon, FactoryIcon, LockIcon, PackageCheckIcon, PencilIcon, SendIcon, ThumbsUpIcon, TruckIcon, WarehouseIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { PANEL_CLASS } from "@/components/common/SheetSection";
import { STATUS_COLORS as COLORS } from "@/config/sale";
import { useStepperVisible } from "@/hooks/useStepperVisible";
import { cn } from "@/lib/utils";

const ICONS = {
  draft: PencilIcon,
  sent: SendIcon,
  accepted: CheckIcon,
  rejected: XIcon,
  expired: ClockIcon,
  confirmed: ThumbsUpIcon,
  in_production: FactoryIcon,
  ready_to_deliver: PackageCheckIcon,
  delivered: TruckIcon,
  closed: LockIcon,
  cancelled: BanIcon,
  scheduled: CalendarCheckIcon,
  in_process: CogIcon,
  finished: CircleCheckIcon,
  transferred: WarehouseIcon,
  pending: HourglassIcon,
  approved: CircleCheckBigIcon,
  partially_received: PackageOpenIcon,
  received: PackageCheckIcon,
  posted: FileCheck2Icon,
};

const EMPTY = { ring: "border-slate-200 text-slate-400", hover: "group-hover:bg-muted", soft: "bg-slate-100 text-slate-500", title: "text-slate-500" };

/**
 * A row of every status of a document, in the order it goes through them, with how many documents are in each.
 * Pressing a step filters the list by that status (press it again to show all). Each step is centred under its
 * big icon; the line joins the centres of the icons.
 *
 *   statuses  status keys in order          counts   { [status]: n } or undefined while loading
 *   value     the status the list is filtered by, "all" when none
 *   onSelect  (status | "all") => void       unit  what is counted: "orders" | "quotations" | "workOrders" | "transfers" (text keys stepper.count.*)
 */
export function StatusStepper({ statuses, counts, value, onSelect, unit = "orders" }) {
  const { t } = useTranslation("sale");
  const [visible] = useStepperVisible();
  if (!visible) return null;

  return (
    <nav aria-label={t("stepper.label")} className={cn(PANEL_CLASS, "mb-4 overflow-x-auto px-3 py-5")}>
      <ol className="flex min-w-max">
        {statuses.map((status, index) => {
          const Icon = ICONS[status];
          const count = counts?.[status];
          const selected = value === status;
          const has = count > 0;
          const color = has ? COLORS[status] : EMPTY;
          return (
            <li key={status} className="relative flex min-w-32 flex-1 flex-col items-center">
              {index < statuses.length - 1 ? <span aria-hidden="true" className="absolute top-8 left-1/2 h-0.5 w-full rounded-full bg-slate-200" /> : null}
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(selected ? "all" : status)}
                className="group relative z-10 flex flex-col items-center gap-1 rounded-lg p-1 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={cn(
                    "grid size-14 place-items-center rounded-full border-2 transition-colors",
                    selected ? `${COLORS[status].solid} text-white` : `bg-card ${color.ring} ${color.hover}`,
                  )}
                >
                  <Icon className="size-7" aria-hidden="true" />
                </span>
                <span className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("stepper.step", { number: index + 1 })}</span>
                <span className={cn("text-sm font-semibold", selected ? COLORS[status].title : has ? "text-slate-900" : "text-slate-500")}>{t(`status.${status}`)}</span>
                <span
                  className={cn(
                    "rounded-md px-2 py-0.5 text-sm font-semibold",
                    selected ? `${COLORS[status].solid} text-white` : color.soft,
                  )}
                >
                  {count == null ? "…" : has ? t(`stepper.count.${unit}`, { count }) : t("stepper.none")}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
