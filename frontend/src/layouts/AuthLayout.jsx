import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import { AuthBackground } from "@/components/common/AuthBackground";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

/**
 * Login screen frame: the flat purple bar with the name of the system and the language, the form centred below it.
 * It is exactly one screen tall (h-dvh); the content only scrolls on an unusually short window.
 */
export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <AuthBackground />

      <header className="relative flex h-12 shrink-0 items-center justify-between bg-primary px-4 text-primary-foreground">
        <p className="text-base font-bold">{t("app.name")}</p>
        <LanguageSwitcher />
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-y-auto px-8 py-4">
        <main id="main-content" className="m-auto w-full max-w-[24rem]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
