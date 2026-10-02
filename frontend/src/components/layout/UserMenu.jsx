import { LogOutIcon, UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LanguageFlag } from "@/components/common/LanguageFlag";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { initials } from "@/utils/format";

const DEPARTMENT_KEYS = {
  Sale: "groups.sale",
  Factory: "groups.factory",
  Purchase: "groups.purchase",
  Accounting: "groups.accounting",
};

export function UserMenu() {
  const { t, i18n } = useTranslation(["nav", "auth", "common"]);
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav:userMenu.open")}
        title={user.name}
        className="grid size-11 place-items-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted"
      >
        {/* Only the avatar is shown; the name is in the menu, the tooltip and the accessible name. */}
        <Avatar className="size-9">
          <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
            {initials(user.name)}
          </AvatarFallback>
        </Avatar>
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
        <p className="px-2 pt-1 pb-1.5 text-sm text-muted-foreground">{t("common:language.label")}</p>
        {/* Small round flags; the language name is the accessible name and the tooltip. */}
        <DropdownMenuRadioGroup
          value={i18n.resolvedLanguage}
          onValueChange={(code) => i18n.changeLanguage(code)}
          className="flex gap-2 px-2 pb-2"
        >
          {SUPPORTED_LANGUAGES.map(({ code, label }) => (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              lang={code}
              aria-label={label}
              title={label}
              onSelect={(event) => event.preventDefault()}
              className="h-10 w-14 justify-center rounded-md border-2 border-transparent p-0 data-[state=checked]:border-primary data-[state=checked]:bg-secondary [&_[data-slot=dropdown-menu-radio-item-indicator]]:hidden"
            >
              <LanguageFlag code={code} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
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
