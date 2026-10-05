import { PowerIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function IconAction({ label, onClick, destructive, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant={destructive ? "destructive" : "outline"} size="icon" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Buttons in the header of a detail sheet. The power button is the status: green while the record is
 * active, grey while it is inactive; one click switches it at once (no confirmation) and the tooltip
 * says what it does. Then Delete (icon, asks first) and Save. Save submits the form `formId`, which can
 * be on another tab.
 */
export function RecordActions({ formId, isSubmitting, isNew, isActive, busy, onToggleStatus, onDelete }) {
  const { t } = useTranslation("master");
  const statusLabel = isActive ? t("common.activeToggle") : t("common.inactiveToggle");
  return (
    <>
      {!isNew ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                role="switch"
                aria-checked={isActive}
                aria-label={statusLabel}
                variant="outline"
                size="icon"
                disabled={busy}
                onClick={onToggleStatus}
                className={cn(
                  isActive
                    ? "border-success/50 bg-success/15 text-success hover:bg-success/25 hover:text-success"
                    : "border-border bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                <PowerIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{statusLabel}</TooltipContent>
          </Tooltip>
          <IconAction label={t("common.delete")} onClick={onDelete} destructive>
            <Trash2Icon />
          </IconAction>
        </>
      ) : null}
      <Button type="submit" form={formId} disabled={isSubmitting}>
        <SaveIcon aria-hidden="true" /> {isSubmitting ? t("common.saving") : t("common.save")}
      </Button>
    </>
  );
}
