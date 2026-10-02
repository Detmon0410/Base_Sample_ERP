import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

/**
 * Application frame. F0 provides the header and content area only;
 * the department sidebar, breadcrumb and user menu arrive in F2.
 */
export function MainLayout() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:text-primary"
      >
        {t("nav:skipToContent")}
      </a>

      <header className="flex h-16 items-center justify-between bg-primary px-8 text-primary-foreground">
        <p className="text-xl font-bold tracking-wide">{t("app.name")}</p>
        <LanguageSwitcher onDark />
      </header>

      <main id="main-content" className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
