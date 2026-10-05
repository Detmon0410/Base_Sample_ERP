import { ChevronDownIcon, LogOutIcon, UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { initials } from "@/utils/format";

const DEPARTMENT_KEYS = {
  Sale: "groups.sale",
  Factory: "groups.factory",
  Purchase: "groups.purchase",
  Accounting: "groups.accounting",
};

/** Profile button of the top bar (avatar, name, arrow). The language has its own button (LanguageMenu). */
export function UserMenu() {
  const { t } = useTranslation(["nav", "auth"]);
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav:userMenu.open")}
        className="flex h-9 items-center gap-2 rounded-lg pr-2 pl-1 text-left text-primary-foreground outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white data-[state=open]:bg-white/15"
      >
        <Avatar className="size-7">
          <AvatarFallback className="bg-white text-xs font-semibold text-primary">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-40 truncate text-base font-semibold">{user.name}</span>
        <ChevronDownIcon className="size-4 text-white/80" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="font-normal">
          <p className="text-base font-semibold text-foreground">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <div className="space-y-1 px-2 pb-2">
          {user.memberships?.map((membership, index) => (
            <p key={index} className="text-sm text-foreground">
              {membership.department
                ? t(`nav:${DEPARTMENT_KEYS[membership.department]}`, membership.department)
                : t("nav:userMenu.noDepartment")}
              {" · "}
              {t(`nav:roles.${membership.role}`, membership.role)}
            </p>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled className="h-10 text-base">
          <UserIcon /> {t("nav:userMenu.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" className="h-10 text-base" onSelect={logout}>
          <LogOutIcon /> {t("auth:logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
