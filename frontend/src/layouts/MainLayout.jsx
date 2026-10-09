import { useTranslation } from "react-i18next";
import { Suspense, useState } from "react";
import { Outlet } from "react-router";

import { RouteLoading } from "@/components/common/RouteLoading";
import { AppHeader } from "@/components/layout/AppHeader";
import { SideNav } from "@/components/layout/SideNav";
import { useLayoutMode } from "@/utils/layoutMode";

/**
 * The frame of every page after the sign-in: the bar at the top, the menu in the bar or in a list on the left (the user chooses
 * with one button, docs/specs/s1-mini-erp-workflow.md section 7), and the page.
 */
export function MainLayout() {
  const { t } = useTranslation("nav");
  const [mode, toggleMode] = useLayoutMode();
  const [narrowOpen, setNarrowOpen] = useState(false); // the menu of a narrow screen

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:px-4 focus:py-2 focus:text-primary"
      >
        {t("skipToContent")}
      </a>
      <AppHeader mode={mode} onToggleMode={toggleMode} narrowOpen={narrowOpen} setNarrowOpen={setNarrowOpen} />
      <div className="flex flex-1 flex-col md:flex-row">
        {mode === "side" ? <SideNav open={narrowOpen} /> : null}
        <main id="main-content" className="w-full min-w-0 flex-1 px-5 pt-4 pb-5">
          <Suspense fallback={<RouteLoading />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
