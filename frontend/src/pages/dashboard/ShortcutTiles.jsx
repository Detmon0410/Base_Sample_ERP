import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { CountBadge } from "@/components/common/CountBadge";
import { getVisibleGroups } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

/** The colour of the bar under each box. Same family as the department colours of the number cards. */
const BAR = {
  sale: "border-b-sky-600",
  factory: "border-b-teal-600",
  stock: "border-b-slate-500",
  purchase: "border-b-amber-600",
  accounting: "border-b-pink-600",
  traceability: "border-b-violet-600",
  masterData: "border-b-emerald-600",
  administration: "border-b-red-500",
};

/**
 * Big boxes to the main parts of the system, one per menu group the user may open (the first page of the group).
 * The red number is the same counter as the menu (what waits in the group).
 */
export function ShortcutTiles() {
  const { t } = useTranslation("nav");
  const { user } = useAuth();
  const { groups } = useNotifications();
  const visible = getVisibleGroups(user).filter((group) => group.items.length > 0);

  return (
    <nav aria-label={t("shortcuts")} className="mb-5">
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))]">
        {visible.map((group) => {
          const Icon = group.icon;
          return (
          <li key={group.key}>
            <Link
              to={group.items[0].to}
              className={cn(
                "relative flex min-h-16 items-center justify-center gap-3 rounded-md border border-b-4 border-slate-300 bg-card px-3 py-4 text-center text-lg font-bold text-slate-700 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring max-md:min-h-14 max-md:text-base",
                BAR[group.key],
              )}
            >
              <Icon className="size-6 shrink-0 max-md:size-5" aria-hidden="true" />
              {t(group.labelKey)}
              <CountBadge count={groups[group.key]?.total} className="absolute top-2 right-3 text-base" />
            </Link>
          </li>
          );
        })}
      </ul>
    </nav>
  );
}
