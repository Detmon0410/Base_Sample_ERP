import { useTranslation } from "react-i18next";
import { Suspense } from "react";
import { Outlet } from "react-router";

import { RouteLoading } from "@/components/common/RouteLoading";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSidebarState } from "@/hooks/useSidebarState";
import { useSidebarWidth } from "@/hooks/useSidebarWidth";

/**
 * Application frame for every page after login: collapsible sidebar on the left,
 * header (menu toggle, breadcrumb, language, user menu) on top, the page below.
 * Widths: 232px expanded by default (drag its right edge to change it, 208-360px), 64px collapsed. The top bar is 54px high.
 */
export function MainLayout() {
  const { t } = useTranslation("nav");
  const [open, setOpen] = useSidebarState();
  const sidebarWidth = useSidebarWidth();

  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider
        open={open}
        onOpenChange={setOpen}
        style={{ "--sidebar-width": `${sidebarWidth.width}px`, "--sidebar-width-icon": "64px" }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-primary"
        >
          {t("skipToContent")}
        </a>

        <AppSidebar width={sidebarWidth} />

        <SidebarInset className="min-w-0 bg-[#F1F5F9]">
          <AppHeader />
          <main id="main-content" className="w-full flex-1 px-5 pt-4 pb-5">
            <Suspense fallback={<RouteLoading />}>
              <Outlet />
            </Suspense>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
