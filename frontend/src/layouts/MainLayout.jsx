import { useTranslation } from "react-i18next";
import { Suspense } from "react";
import { Outlet } from "react-router";

import { RouteLoading } from "@/components/common/RouteLoading";
import { AppHeader } from "@/components/layout/AppHeader";

/**
 * The frame of every page after the sign-in: the bar at the top with the menu and the user menu, and the page below it. There is no
 * sidebar (docs/specs/s1-mini-erp-workflow.md section 7).
 */
export function MainLayout() {
  const { t } = useTranslation("nav");

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:px-4 focus:py-2 focus:text-primary"
      >
        {t("skipToContent")}
      </a>
      <AppHeader />
      <main id="main-content" className="w-full min-w-0 flex-1 px-5 pt-4 pb-5">
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
