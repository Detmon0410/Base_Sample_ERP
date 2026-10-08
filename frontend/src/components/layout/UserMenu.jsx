import { ChevronDownIcon, LogOutIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { RoleHat } from "@/components/common/RoleHat";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { topRole } from "@/config/roleStyle";
import { PERSIST, resetTestData } from "@/services/mock/persist";

/** Profile button of the top bar: the safety helmet of the role (white Manager, yellow Worker, red Admin), name and role, arrow. The language has its own button (LanguageMenu). */
export function UserMenu() {
  const { t } = useTranslation(["nav", "auth"]);
  const { user, logout } = useAuth();
  const [resetOpen, setResetOpen] = useState(false); // the workflow test: forget everything that was made
  if (!user) return null;
  const role = topRole(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav:userMenu.open")}
        className="flex h-9 items-center gap-2 rounded-lg pr-2 pl-1 text-left text-primary-foreground outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white data-[state=open]:bg-white/15"
      >
        <RoleHat role={role} className="size-7" />
        <span className="flex max-w-44 flex-col leading-tight">
          <span className="truncate text-base font-semibold">{user.name}</span>
          <span className="truncate text-xs text-white/85">{role ? t(`nav:roles.${role}`, role) : ""}</span>
        </span>
        <ChevronDownIcon className="size-4 text-white/80" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-3 p-3 font-normal">
          <RoleHat role={role} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate text-lg leading-tight font-semibold text-foreground">{user.name}</span>
            <span className="block truncate text-sm text-muted-foreground">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PERSIST ? (
          <DropdownMenuItem className="h-10 text-base" onSelect={() => setResetOpen(true)}>
            <RotateCcwIcon /> {t("nav:userMenu.resetData")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem variant="destructive" className="h-10 text-base" onSelect={logout}>
          <LogOutIcon /> {t("auth:logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t("nav:userMenu.resetTitle")}
        description={t("nav:userMenu.resetDescription")}
        confirmLabel={t("nav:userMenu.resetConfirm")}
        cancelLabel={t("nav:userMenu.resetCancel")}
        onConfirm={resetTestData}
        destructive
      />
    </DropdownMenu>
  );
}
