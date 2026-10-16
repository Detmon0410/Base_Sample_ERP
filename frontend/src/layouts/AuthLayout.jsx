import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import { AppLogo } from "@/components/common/AppLogo";
import { AuthBackground } from "@/components/common/AuthBackground";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

/**
 * Login screen frame: the bar with the logo and the language, the logo again above the form, the form centred below it.
 * It is exactly one screen tall (h-dvh); the content only scrolls on an unusually short window.
 */
export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <AuthBackground />

      <header className="relative flex h-12 shrink-0 items-center justify-between bg-primary px-4 text-primary-foreground">
        <AppLogo label={t("app.name")} className="size-9 rounded-md bg-white p-0.5" />
        <LanguageSwitcher />
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-y-auto px-8 py-4">
        <main id="main-content" className="m-auto flex w-full max-w-[24rem] flex-col items-center gap-4">
          <AppLogo className="size-24" />
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
