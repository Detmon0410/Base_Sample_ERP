import { ChevronDownIcon, LogOutIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

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

/** Profile button of the top bar: the safety helmet of the role (white Manager, yellow Worker, red Admin), name and role, arrow. The language has its own button (LanguageMenu). */
export function UserMenu() {
  const { t } = useTranslation(["nav", "auth"]);
  const { user, logout } = useAuth();
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
        <DropdownMenuItem variant="destructive" className="h-10 text-base" onSelect={logout}>
          <LogOutIcon /> {t("auth:logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
