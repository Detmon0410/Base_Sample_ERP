import { SaveIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function IconAction({ label, onClick, destructive, disabled, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={destructive ? "size-9 text-destructive hover:bg-destructive/10 hover:text-destructive" : "size-9 text-slate-600"}
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Buttons in the header of a detail sheet. The toggle is the status: green and on while the record is
 * active, grey and off while it is inactive; one click switches it at once (no confirmation) and the tooltip
 * says what it does. Then Delete (a quiet red icon, asks first) and Save (the only filled button, like the header of a Sale document). Save submits the form `formId`, which can
 * be on another tab.
 */
export function RecordActions({ formId, isSubmitting, isNew, isActive, busy, onToggleStatus, onDelete, statusLocked = false, deleteLocked = false }) {
  const { t } = useTranslation("master");
  const statusLabel = isActive ? t("common.activeToggle") : t("common.inactiveToggle");
  return (
    <>
      {!isNew ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Switch checked={isActive} onCheckedChange={() => onToggleStatus()} disabled={busy || statusLocked} aria-label={statusLabel} />
              </span>
            </TooltipTrigger>
            <TooltipContent>{statusLabel}</TooltipContent>
          </Tooltip>
          <IconAction label={t("common.delete")} onClick={onDelete} destructive disabled={deleteLocked}>
            <Trash2Icon />
          </IconAction>
        </>
      ) : null}
      <Button type="submit" form={formId} size="sm" className="h-9" disabled={isSubmitting}>
        <SaveIcon aria-hidden="true" /> {isSubmitting ? t("common.saving") : t("common.save")}
      </Button>
    </>
  );
}
