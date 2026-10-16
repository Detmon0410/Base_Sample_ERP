import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink, useLocation } from "react-router";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { NavIcon } from "@/components/layout/NavIcon";
import { getVisibleNav } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

// One look for every entry of the bar: the same weight always (nothing jumps when it becomes the current one); the current page, or the menu
// that holds it, gets a lighter block and a white line under it.
const ENTRY = "relative inline-flex h-full min-h-14 items-center gap-2 px-3 text-base font-medium text-white/90 lg:px-4 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white";
const CURRENT = "bg-white/15 text-white after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-white";

const isUnder = (pathname, base) => (base === "/" ? pathname === "/" : pathname === base || pathname.startsWith(`${base}/`));

/**
 * The bar at the top of every page after the sign-in (there is no sidebar): the name of the system, the menu in one row (a menu with
 * sub-entries opens a list under it) and, at the right, the **user menu**: the name of the user opens a list with who they are
 * (e-mail, role, department), the language and Log out. On a narrow screen the menu is behind the "Menu" button.
 *
 */
export function AppHeader() {
  const { t } = useTranslation(["nav", "auth", "common", "master"]);
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  // What is open, with the page it was opened on: opening another page closes the menus without an effect.
  const [state, setState] = useState({ open: null, narrow: false, path: pathname }); // open: the key of the open menu, or "user"; narrow: the whole menu on a narrow screen
  const current = state.path === pathname ? state : { open: null, narrow: false, path: pathname };
  const open = current.open;
  const narrowOpen = current.narrow;
  const setOpen = (value) => setState((old) => ({ ...(old.path === pathname ? old : { narrow: false }), open: typeof value === "function" ? value(old.path === pathname ? old.open : null) : value, path: pathname }));
  const setNarrowOpen = (value) => setState((old) => ({ ...(old.path === pathname ? old : { open: null }), narrow: typeof value === "function" ? value(old.path === pathname ? old.narrow : false) : value, path: pathname }));
  const bar = useRef(null);

  // a click outside the bar or Escape closes an open menu
  useEffect(() => {
    const closeMenu = () => setState((old) => ({ ...old, open: null }));
    const onDown = (event) => {
      if (bar.current && !bar.current.contains(event.target)) closeMenu();
    };
    const onKey = (event) => event.key === "Escape" && closeMenu();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const nav = getVisibleNav(user);
  const toggle = (key) => setOpen((value) => (value === key ? null : key));
  const link = (item) => (
    <NavLink key={item.key} to={item.to} end={item.to === "/"} className={({ isActive }) => cn(ENTRY, isActive && CURRENT)}>
      <NavIcon name={item.icon} />
      {t(`nav:${item.labelKey}`)}
    </NavLink>
  );

  return (
    <header ref={bar} className="relative z-20 flex min-h-14 flex-wrap items-stretch bg-primary text-primary-foreground shadow-sm">
      <Link to="/" className="mr-1 inline-flex shrink-0 items-center px-4 text-lg font-bold tracking-tight text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white">
        {t("common:app.name")}
      </Link>

      <nav aria-label={t("nav:mainMenu")} className={cn("order-3 w-full flex-col md:order-none md:flex md:w-auto md:flex-row md:items-stretch", narrowOpen ? "flex" : "hidden")}>
        {nav.map((entry) =>
          entry.type === "link" ? (
            link(entry.item)
          ) : (
            <div key={entry.key} className="relative flex md:items-stretch">
              <button
                type="button"
                aria-expanded={open === entry.key}
                onClick={() => toggle(entry.key)}
                className={cn(ENTRY, "w-full md:w-auto", (open === entry.key || entry.items.some((item) => isUnder(pathname, item.to))) && CURRENT)}
              >
                <NavIcon name={entry.icon} />
                {t(`nav:${entry.labelKey}`)}
                <NavIcon name="down" className="size-3.5" />
              </button>
              {open === entry.key ? (
                <ul className="m-0 min-w-56 list-none border border-border bg-card py-1 text-foreground md:absolute md:top-full md:left-0 md:shadow-md">
                  {entry.items.map((item) => (
                    <li key={item.key}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn("flex items-center gap-3 border-l-4 px-4 py-2.5 whitespace-nowrap outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", isActive ? "border-primary bg-accent font-semibold text-foreground" : "border-transparent text-foreground")
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <NavIcon name={item.icon} className={isActive ? "text-primary" : "text-muted-foreground"} />
                            {t(`nav:${item.labelKey}`)}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ),
        )}
      </nav>

      <div className="ml-auto flex items-stretch">
        <button type="button" aria-expanded={narrowOpen} onClick={() => setNarrowOpen((value) => !value)} className={cn(ENTRY, "md:hidden")}>
          {t("nav:menu")}
        </button>

        <div className="relative flex items-stretch">
          <button type="button" aria-label={user?.name} aria-expanded={open === "user"} aria-haspopup="true" onClick={() => toggle("user")} className={cn(ENTRY, "gap-3", open === "user" && "bg-white/15 text-white")}>
            <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-white/25 text-sm font-bold text-white">
              {(user?.name ?? "?").trim().charAt(0).toUpperCase()}
            </span>
            <span className="hidden xl:inline">{user?.name}</span>
            <NavIcon name="down" className="size-3.5" />
          </button>
          {open === "user" ? (
            <div role="group" aria-label={t("nav:userMenu")} className="absolute top-full right-0 z-30 w-72 max-w-[calc(100vw-1rem)] border border-border bg-card p-4 text-foreground shadow-md">
              <p className="font-bold">{user?.name}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <dl className="my-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-muted-foreground">{t("nav:role")}</dt>
                <dd className="font-semibold">{t(`nav:roles.${user?.role}`, user?.role)}</dd>
                <dt className="text-muted-foreground">{t("nav:department")}</dt>
                <dd>{t(`master:users.departments.${user?.department}`, user?.department)}</dd>
              </dl>
              <div className="flex items-center justify-between gap-3 border-t border-border py-3 text-sm">
                <span className="text-muted-foreground">{t("common:language.label")}</span>
                <LanguageSwitcher />
              </div>
              <button
                type="button"
                onClick={logout}
                className="w-full border border-slate-300 bg-secondary px-3 py-2 text-left font-medium text-secondary-foreground outline-none hover:bg-[#e4e4e4] focus-visible:ring-2 focus-visible:ring-ring"
              >
                {t("auth:logout")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
