import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

/** Two columns: brand panel on the left, the page (login form) on the right. */
export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-screen grid-cols-[2fr_3fr]">
      <aside className="flex flex-col justify-between bg-primary p-12 text-primary-foreground">
        <p className="text-3xl font-bold tracking-wide">{t("app.name")}</p>
        <p className="max-w-sm text-xl leading-relaxed">{t("app.tagline")}</p>
      </aside>

      <div className="relative flex items-center justify-center bg-background p-12">
        <LanguageSwitcher className="absolute top-6 right-8" />
        <main id="main-content" className="w-full max-w-md">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
