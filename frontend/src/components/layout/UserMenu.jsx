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

export function UserMenu() {
  const { t } = useTranslation(["nav", "auth"]);
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav:userMenu.open")}
        className="flex h-11 items-center gap-3 rounded-lg px-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold">{user.name}</span>
        <ChevronDownIcon className="size-4 text-muted-foreground" aria-hidden="true" />
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
        <DropdownMenuItem className="h-10 text-base" onSelect={logout}>
          <LogOutIcon /> {t("auth:logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
