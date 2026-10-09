import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

import { getVisibleNav } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ITEM = "block px-4 py-2 text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring";

/**
 * The menu as a list on the left (the other place of the menu, see AppHeader). Every entry is shown at once: a menu with
 * sub-entries is a small heading with its entries under it. On a narrow screen it is behind the "Menu" button of the bar.
 */
export function SideNav({ open }) {
  const { t } = useTranslation("nav");
  const { user } = useAuth();

  const link = (item, indent) => (
    <NavLink key={item.key} to={item.to} end={item.to === "/"} className={({ isActive }) => cn(ITEM, indent && "pl-8", isActive && "bg-accent font-bold")}>
      {t(item.labelKey)}
    </NavLink>
  );

  return (
    <nav aria-label={t("mainMenu")} className={cn("w-full shrink-0 border-b border-border bg-card py-2 md:block md:w-56 md:border-r md:border-b-0", open ? "block" : "hidden")}>
      {getVisibleNav(user).map((entry) =>
        entry.type === "link" ? (
          link(entry.item, false)
        ) : (
          <div key={entry.key}>
            <p className="px-4 pt-3 pb-1 text-sm font-bold text-muted-foreground">{t(entry.labelKey)}</p>
            {entry.items.map((item) => link(item, true))}
          </div>
        ),
      )}
    </nav>
  );
}
