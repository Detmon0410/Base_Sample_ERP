import { PanelLeftIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { LanguageMenu } from "@/components/layout/LanguageMenu";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * Compact top bar (54px): menu toggle and breadcrumb on the left; on the right the profile
 * button (avatar + name) and, separately, the language button (flag).
 */
export function AppHeader() {
  const { t } = useTranslation("nav");
  const { toggleSidebar, open } = useSidebar();

  return (
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b bg-card px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-9"
        aria-label={t("toggleMenu")}
        aria-expanded={open}
        title={t("toggleMenu")}
        onClick={toggleSidebar}
      >
        <PanelLeftIcon />
      </Button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <div className="flex items-center gap-1">
        <UserMenu />
        <span aria-hidden="true" className="mx-1.5 h-5 w-px bg-border" />
        <LanguageMenu />
      </div>
    </header>
  );
}
