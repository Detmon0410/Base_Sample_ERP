import { Trash2Icon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CARD_CLASS } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { DocumentStatusBadge } from "./DocumentStatusBadge";

/**
 * A document opened as a dialog in the middle of the page, laid out like a Trello card: a header with the title,
 * the status, Delete and Close, two columns that scroll on their own, the main work on the left (60 %) and the history
 * and the links on the right (40 %), and a footer with the status buttons and Save. On a narrow window the columns stack.
 * `page` is the result of useRecordForm; the delete and leave confirmations and the loading / not found / error
 * states are the same as in DocumentSheet.
 *
 *   title       the big title, the status badge follows it     heading   only read by screen readers
 *   status      status of a saved document                     actions   the status buttons (<DocumentActions>)
 *   canEdit     the form is editable: shows Delete and Save    formId / singular   as in DocumentSheet
 *   left, right the two columns
 */
export function DocumentDialog({ page, entityTitle, heading, title, status, actions, canEdit, formId, singular, left, right }) {
  const { t } = useTranslation("sale");
  const { isNew, loadState, leaving, goToList, listPath } = page;
  const frame = "h-[min(92vh,60rem)] w-[min(96vw,80rem)]";
  const focusPanel = (event) => {
    // focus the panel, not the first button: a focused button would open its tooltip and Esc would only close that
    event.preventDefault();
    event.currentTarget.focus();
  };

  if (loadState !== "ready") {
    return (
      <Dialog open={!leaving} onOpenChange={(open) => !open && goToList()}>
        <DialogContent className={frame} onOpenAutoFocus={focusPanel}>
          <DialogTitle className="sr-only">{entityTitle}</DialogTitle>
          <DialogDescription className="sr-only">{entityTitle}</DialogDescription>
          {loadState === "loading" ? (
            <div className="flex flex-col gap-4 p-6" aria-busy="true">
              <Skeleton className="h-10 w-72" />
              <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
                <Skeleton className="h-64 rounded-xl" />
                <Skeleton className="h-64 rounded-xl" />
              </div>
            </div>
          ) : (
            <div role="alert" className={`m-6 flex flex-col items-start gap-4 p-6 ${CARD_CLASS}`}>
              <p>{t(loadState === "notFound" ? "sheet.notFound" : "sheet.loadError")}</p>
              <Button asChild variant="outline">
                <Link to={listPath}>{t("sheet.backToList")}</Link>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={!leaving} onOpenChange={(open) => !open && goToList()}>
        <DialogContent className={frame} onOpenAutoFocus={focusPanel}>
          <header className="shrink-0 border-b bg-card px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-3">
                  <DialogTitle className="truncate text-2xl">{title}</DialogTitle>
                  {!isNew && status ? <DocumentStatusBadge status={status} /> : null}
                </div>
                <DialogDescription className="sr-only">{heading}</DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canEdit && !isNew ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={t("sheet.delete")} onClick={() => page.setDialog("delete")}>
                        <Trash2Icon />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("sheet.delete")}</TooltipContent>
                  </Tooltip>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="size-9 text-slate-600" aria-label={t("sheet.close")} onClick={goToList}>
                      <XIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("sheet.close")}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </header>

          <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[3fr_2fr] lg:overflow-hidden">
            <div className="flex min-h-0 flex-col gap-4 p-5 lg:overflow-y-auto">{left}</div>
            <div className="flex min-h-0 flex-col gap-4 border-slate-200 p-5 lg:overflow-y-auto lg:border-l">{right}</div>
          </div>
          {actions || canEdit ? (
            <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t bg-card px-6 py-3">
              {actions}
              {canEdit ? (
                <Button type="submit" form={formId} size="sm" className="ml-auto h-9" disabled={page.isSubmitting}>
                  {page.isSubmitting ? t("sheet.saving") : t("sheet.save")}
                </Button>
              ) : null}
            </footer>
          ) : null}
        </DialogContent>
      </Dialog>

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
