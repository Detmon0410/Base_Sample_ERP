import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";

/**
 * The two confirmations of a master data form: delete, and leave with unsaved changes. (Deactivate and
 * reactivate need none: the status button in the header switches at once.) `dialog` is "delete" | "leave" |
 * null (state of useRecordForm); `name` is the singular entity name for the texts ("material").
 */
export function RecordDialogs({ dialog, setDialog, busy, onRemove, onLeave, name }) {
  const { t } = useTranslation("master");
  const close = (open) => !open && setDialog(null);

  return (
    <>
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
