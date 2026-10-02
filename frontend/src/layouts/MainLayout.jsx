import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSidebarState } from "@/hooks/useSidebarState";

/**
 * Application frame for every page after login: collapsible sidebar on the left,
 * header (menu toggle, breadcrumb, language, user menu) on top, the page below.
 * Widths: 280px expanded, 64px collapsed.
 */
export function MainLayout() {
  const { t } = useTranslation("nav");
  const [open, setOpen] = useSidebarState();

  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider
        open={open}
        onOpenChange={setOpen}
        style={{ "--sidebar-width": "280px", "--sidebar-width-icon": "64px" }}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-primary"
        >
          {t("skipToContent")}
        </a>

        <AppSidebar />

        <SidebarInset className="min-w-0 bg-background">
          <AppHeader />
          <main id="main-content" className="mx-auto w-full max-w-[1600px] flex-1 p-8">
            <Outlet />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
