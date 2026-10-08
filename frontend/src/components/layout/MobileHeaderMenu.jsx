import { CheckIcon, EllipsisVerticalIcon, EyeIcon, EyeOffIcon, LogOutIcon, RefreshCwIcon, RotateCcwIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { LanguageFlag } from "@/components/common/LanguageFlag";
import { RoleHat } from "@/components/common/RoleHat";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { topRole } from "@/config/roleStyle";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { useStepperVisible } from "@/hooks/useStepperVisible";
import { SUPPORTED_LANGUAGES } from "@/i18n";
import { PERSIST, resetTestData } from "@/services/mock/persist";
import { requestRefresh } from "@/utils/masterEvents";

/**
 * The one button of the top bar on a phone (docs/specs/f16-mobile.md): who is signed in, Refresh, show / hide the status steps,
 * the language and Log out, in one list with big rows. On a bigger screen these are separate buttons in the bar.
 */
export function MobileHeaderMenu({ className }) {
  const { t, i18n } = useTranslation(["nav", "auth", "common"]);
  const { user, logout } = useAuth();
  const [stepperVisible, toggleStepper] = useStepperVisible();
  const [resetOpen, setResetOpen] = useState(false);
  if (!user) return null;
  const role = topRole(user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("nav:more")}
        title={t("nav:more")}
        className={cn("grid size-10 shrink-0 place-items-center rounded-lg outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white data-[state=open]:bg-white/15", className)}
      >
        <EllipsisVerticalIcon className="size-6" aria-hidden="true" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-3 p-3 font-normal">
          <RoleHat role={role} className="size-10" />
          <span className="min-w-0">
            <span className="block truncate text-lg leading-tight font-semibold text-foreground">{user.name}</span>
            <span className="block truncate text-sm text-muted-foreground">{role ? t(`nav:roles.${role}`, role) : user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="h-12 text-base" onSelect={requestRefresh}>
          <RefreshCwIcon /> {t("nav:refresh")}
        </DropdownMenuItem>
        <DropdownMenuItem className="h-12 text-base" onSelect={toggleStepper}>
          {stepperVisible ? <EyeOffIcon /> : <EyeIcon />} {t(stepperVisible ? "nav:hideSteppers" : "nav:showSteppers")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map(({ code, label }) => (
          <DropdownMenuItem key={code} lang={code} className="h-12 gap-3 text-base" onSelect={() => i18n.changeLanguage(code)}>
            <LanguageFlag code={code} />
            <span className="flex-1">{label}</span>
            {i18n.resolvedLanguage === code ? <CheckIcon aria-hidden="true" /> : null}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        {PERSIST ? (
          <DropdownMenuItem className="h-12 text-base" onSelect={() => setResetOpen(true)}>
            <RotateCcwIcon /> {t("nav:userMenu.resetData")}
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem variant="destructive" className="h-12 text-base" onSelect={logout}>
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
