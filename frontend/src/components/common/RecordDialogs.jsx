import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";

/**
 * The three confirmations of a master data form: deactivate / reactivate, delete, leave with unsaved
 * changes. `dialog` is "status" | "delete" | "leave" | null (state of useRecordForm); `name` is the
 * singular entity name for the texts ("material").
 */
export function RecordDialogs({ dialog, setDialog, isActive, busy, onToggleStatus, onRemove, onLeave, name }) {
  const { t } = useTranslation("master");
  const close = (open) => !open && setDialog(null);

  return (
    <>
      <ConfirmDialog
        open={dialog === "status"}
        onOpenChange={close}
        title={t(isActive ? "generic.deactivateTitle" : "generic.reactivateTitle", { name })}
        description={t(isActive ? "generic.deactivateDescription" : "generic.reactivateDescription")}
        confirmLabel={isActive ? t("common.deactivate") : t("common.reactivate")}
        cancelLabel={t("common.cancel")}
        onConfirm={onToggleStatus}
        busy={busy}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={close}
        title={t("generic.deleteTitle", { name })}
        description={t("generic.deleteDescription", { name })}
        confirmLabel={busy ? t("common.deleting") : t("common.delete")}
        cancelLabel={t("common.cancel")}
        onConfirm={onRemove}
        destructive
        busy={busy}
      />
      <ConfirmDialog
        open={dialog === "leave"}
        onOpenChange={close}
        title={t("common.unsavedTitle")}
        description={t("common.unsavedDescription")}
        confirmLabel={t("common.leave")}
        cancelLabel={t("common.stay")}
        onConfirm={onLeave}
      />
    </>
  );
}
