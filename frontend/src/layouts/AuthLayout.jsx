import { FactoryIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import { AuthBackground } from "@/components/common/AuthBackground";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

/**
 * Login screen frame: a transparent navbar floating over a soft background, with
 * the page centered below it. It is exactly one screen tall (h-dvh) so the page itself
 * never scrolls. The content area only scrolls as a safety net on an unusually short
 * window, so nothing is ever cut off.
 */
export function AuthLayout() {
  const { t } = useTranslation();

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <AuthBackground />

      <header className="relative flex h-14 shrink-0 items-center justify-between px-8 text-primary">
        <p className="flex items-center gap-2.5 text-lg font-bold tracking-wide">
          <FactoryIcon className="size-6" aria-hidden="true" />
          {t("app.name")}
        </p>
        <LanguageSwitcher />
      </header>

      <div className="relative flex min-h-0 flex-1 overflow-y-auto px-8 pb-2">
        <main id="main-content" className="m-auto w-full max-w-[24rem]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
