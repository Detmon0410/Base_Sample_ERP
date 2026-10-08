import { useTranslation } from "react-i18next";
import { Suspense, useState } from "react";
import { Outlet, useLocation } from "react-router";

import { RouteLoading } from "@/components/common/RouteLoading";

import { AppHeader } from "@/components/layout/AppHeader";
import { NotificationsProvider } from "@/components/layout/NotificationsProvider";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNarrow } from "@/hooks/useNarrow";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useSidebarWidth } from "@/hooks/useSidebarWidth";

/**
 * Application frame for every page after login: collapsible sidebar on the left,
 * header (menu toggle, breadcrumb, language, user menu) on top, the page below.
 * Widths: 232px expanded by default (drag its right edge to change it, 208-360px), 64px collapsed. The top bar is 54px high.
 * Narrower than 992px (a tablet held upright): the menu is always a 64px rail; the toggle opens it OVER the page with a dark
 * backdrop (the page does not move), and opening a page or touching the backdrop closes it again (docs/specs/f15-tablet.md).
 */
export function MainLayout() {
  const { t } = useTranslation("nav");
  const [open, setOpen] = useSidebarState();
  const sidebarWidth = useSidebarWidth();
  const narrow = useNarrow();
  const [peek, setPeek] = useState(false); // the menu opened over the page (narrow screens only)
  const { pathname } = useLocation();
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setPeek(false); // opening a page closes the menu
  }

  return (
    <TooltipProvider delayDuration={200}>
      <NotificationsProvider>
      <SidebarProvider
        open={narrow ? peek : open}
        onOpenChange={narrow ? setPeek : setOpen}
        style={{ "--sidebar-width": `${sidebarWidth.width}px`, "--sidebar-width-icon": "64px" }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-primary"
        >
          {t("skipToContent")}
        </a>

        {narrow && peek ? <button type="button" aria-label={t("closeMenu")} className="fixed inset-0 z-30 bg-black/40" onClick={() => setPeek(false)} /> : null}
        <AppSidebar width={sidebarWidth} />

        <SidebarInset className="min-w-0 bg-[#F1F5F9]">
          <AppHeader />
          <main id="main-content" className="w-full flex-1 px-5 pt-4 pb-5 max-[991px]:px-4">
            <Suspense fallback={<RouteLoading />}>
              <Outlet />
            </Suspense>
          </main>
        </SidebarInset>
      </SidebarProvider>
      </NotificationsProvider>
    </TooltipProvider>
  );
}
