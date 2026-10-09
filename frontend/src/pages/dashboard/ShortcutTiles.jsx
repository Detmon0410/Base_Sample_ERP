import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { getVisibleGroups } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
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
 * On a wide screen (1280 px and more) they stand in ONE row whatever their number: the icon goes above the name and the text
 * grows and shrinks with the width of the window. On a smaller screen they wrap, 2 or 4 per row. The icon is always above the name.
 */
export function ShortcutTiles() {
  const { t } = useTranslation("nav");
  const { user } = useAuth();
  const visible = getVisibleGroups(user).filter((group) => group.items.length > 0);

  return (
    <nav aria-label={t("shortcuts")} className="mb-5">
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-4 xl:grid-cols-[repeat(var(--tiles),minmax(0,1fr))] xl:gap-2" style={{ "--tiles": visible.length }}>
        {visible.map((group) => {
          const Icon = group.icon;
          return (
          <li key={group.key}>
            <Link
              to={group.items[0].to}
              className={cn(
                "relative flex min-h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-md border border-b-4 border-slate-300 bg-card px-2 py-3 text-center text-base leading-tight font-bold text-slate-700 outline-none hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring xl:px-1.5 xl:text-[clamp(0.75rem,0.85vw,1.125rem)]",
                BAR[group.key],
              )}
            >
              <Icon className="size-6 shrink-0 xl:size-[clamp(1.25rem,1.4vw,1.75rem)]" aria-hidden="true" />
              <span className="max-w-full min-w-0 truncate">{t(group.labelKey)}</span>
            </Link>
          </li>
          );
        })}
      </ul>
    </nav>
  );
}
