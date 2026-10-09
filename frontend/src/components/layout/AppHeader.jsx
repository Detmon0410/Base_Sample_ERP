import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { getVisibleNav } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const ENTRY = "inline-flex h-full items-center px-3 text-primary-foreground/90 outline-none hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-white";

/**
 * The bar at the top of every page after the sign-in: the name of the system, the menu in one row (a menu with sub-entries opens
 * a list under it), the user with the role as a word, the language as words and Log out. No icons, no clock, no sidebar
 * (docs/specs/s1-mini-erp-workflow.md, section 7). The look is S2; this is the bare structure.
 */
export function AppHeader() {
  const { t } = useTranslation(["nav", "auth", "common"]);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(null); // the key of the open menu
  const [narrowOpen, setNarrowOpen] = useState(false); // the whole menu on a narrow screen
  const bar = useRef(null);

  // opening a page closes the menus
  useEffect(() => {
    setOpen(null);
    setNarrowOpen(false);
  }, [pathname]);

  // a click outside the bar or Escape closes an open menu
  useEffect(() => {
    const onDown = (event) => {
      if (bar.current && !bar.current.contains(event.target)) setOpen(null);
    };
    const onKey = (event) => event.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const nav = getVisibleNav(user);
  const link = (item) => (
    <NavLink key={item.key} to={item.to} end={item.to === "/"} className={({ isActive }) => cn(ENTRY, isActive && "bg-black/15 font-bold")}>
      {t(`nav:${item.labelKey}`)}
    </NavLink>
  );

  return (
    <header ref={bar} className="relative z-20 flex min-h-12 flex-wrap items-stretch bg-primary text-primary-foreground">
      <Link to="/" className="inline-flex items-center px-4 text-xl font-bold text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-white">
        {t("common:app.name")}
      </Link>

      <button
        type="button"
        aria-expanded={narrowOpen}
        onClick={() => setNarrowOpen((value) => !value)}
        className={cn(ENTRY, "ml-auto md:hidden")}
      >
        {t("nav:menu")}
      </button>

      <nav aria-label={t("nav:mainMenu")} className={cn("w-full flex-col md:flex md:w-auto md:flex-row md:items-stretch", narrowOpen ? "flex" : "hidden")}>
        {nav.map((entry) =>
          entry.type === "link" ? (
            link(entry.item)
          ) : (
            <div key={entry.key} className="relative flex md:items-stretch">
              <button
                type="button"
                aria-expanded={open === entry.key}
                onClick={() => setOpen((value) => (value === entry.key ? null : entry.key))}
                className={cn(ENTRY, "w-full md:w-auto", open === entry.key && "bg-black/15")}
              >
                {t(`nav:${entry.labelKey}`)} <span aria-hidden="true">&nbsp;v</span>
              </button>
              {open === entry.key ? (
                <ul className="m-0 min-w-44 list-none border border-slate-300 bg-card p-0 text-slate-700 md:absolute md:top-full md:left-0">
                  {entry.items.map((item) => (
                    <li key={item.key}>
                      <NavLink to={item.to} className="block px-3 py-2 text-slate-700 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
                        {t(`nav:${item.labelKey}`)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ),
        )}
      </nav>

      <div className="flex w-full items-center gap-4 px-4 py-1 md:ml-auto md:w-auto">
        <span>
          {user?.name} <span className="opacity-80">({t(`nav:roles.${user?.role}`, user?.role)})</span>
        </span>
        <LanguageSwitcher />
        <button type="button" onClick={logout} className="px-1 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white">
          {t("auth:logout")}
        </button>
      </div>
    </header>
  );
}
