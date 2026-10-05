import { SaveIcon, Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { DetailSheet } from "@/components/common/DetailSheet";
import { CARD_CLASS } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { DocumentStatusBadge } from "./DocumentStatusBadge";

/**
 * The whole sheet of a Sale document: header (number, status, status buttons, delete icon, Save, close),
 * the delete and leave confirmations, and the loading / not found / error states. `page` is the result of
 * useRecordForm.
 *
 *   entityTitle  "Quotations" (shown while nothing is loaded)
 *   newTitle     "New quotation"
 *   status       status of the saved document (undefined while new)
 *   waiting      the draft is waiting for approval (shows the "Waiting for approval" badge)
 *   actions      the status buttons (<DocumentActions>), shown before the icon buttons
 *   canEdit      draft + the user may work in Sale: shows Delete and Save
 *   singular     "quotation", used in the delete confirmation
 */
export function DocumentSheet({ page, entityTitle, newTitle, titleOf, status, waiting = false, actions, canEdit, formId, singular, children }) {
  const { t } = useTranslation("sale");
  const { isNew, record, loadState, leaving, goToList, listPath } = page;
  const sheetProps = { open: !leaving, onClose: goToList, defaultWidth: 880, widthKey: "kanou.documentSheetWidth" };

  if (loadState === "loading") {
    return (
      <DetailSheet title={entityTitle} {...sheetProps}>
        <div className="flex flex-col gap-4 p-5" aria-busy="true">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </DetailSheet>
    );
  }
  if (loadState !== "ready") {
    return (
      <DetailSheet title={entityTitle} {...sheetProps}>
        <div role="alert" className={`m-5 flex flex-col items-start gap-4 p-6 ${CARD_CLASS}`}>
          <p>{t(loadState === "notFound" ? "sheet.notFound" : "sheet.loadError")}</p>
          <Button asChild variant="outline">
            <Link to={listPath}>{t("sheet.backToList")}</Link>
          </Button>
        </div>
      </DetailSheet>
    );
  }

  return (
    <>
      <DetailSheet
        title={isNew ? newTitle : titleOf(record)}
        badge={!isNew && (status || waiting) ? <DocumentStatusBadge status={status} waiting={waiting} /> : null}
        actions={
          <>
            {actions}
            {canEdit && !isNew ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="destructive" size="icon" aria-label={t("sheet.delete")} onClick={() => page.setDialog("delete")}>
                    <Trash2Icon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t("sheet.delete")}</TooltipContent>
              </Tooltip>
            ) : null}
            {canEdit ? (
              <Button type="submit" form={formId} disabled={page.isSubmitting}>
                <SaveIcon aria-hidden="true" /> {page.isSubmitting ? t("sheet.saving") : t("sheet.save")}
              </Button>
            ) : null}
          </>
        }
        {...sheetProps}
      >
        {children}
      </DetailSheet>

      <ConfirmDialog
        open={page.dialog === "delete"}
        onOpenChange={(open) => !open && page.setDialog(null)}
        title={t("sheet.deleteTitle", { name: singular })}
        description={t("sheet.deleteDescription", { name: singular })}
        confirmLabel={page.busy ? t("sheet.deleting") : t("sheet.delete")}
        cancelLabel={t("dialog.cancel")}
        onConfirm={page.remove}
        destructive
        busy={page.busy}
      />
      <ConfirmDialog
        open={page.dialog === "leave"}
        onOpenChange={(open) => !open && page.setDialog(null)}
        title={t("sheet.unsavedTitle")}
        description={t("sheet.unsavedDescription")}
        confirmLabel={t("sheet.leave")}
        cancelLabel={t("sheet.stay")}
        onConfirm={() => page.exitTo(listPath)}
      />
    </>
  );
}
