import { PanelLeftIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

/** Top bar: menu toggle and breadcrumb on the left, the user menu (with the language) on the right. */
export function AppHeader() {
  const { t } = useTranslation("nav");
  const { toggleSidebar, open } = useSidebar();

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-4 border-b bg-card px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
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

      <UserMenu />
    </header>
  );
}
