import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Confirmation of one status action ("Send this quotation?"): says exactly what will happen, offers a note
 * (optional or required) that is written to the status history, and keeps the dialog open while it works.
 *   noteMode  null (no note) | "optional" | "required"
 *   onConfirm(note)  async; the dialog closes when it resolves and stays open when it throws
 */
export function ActionDialog({ open, onOpenChange, title, description, confirmLabel, noteMode, danger = false, onConfirm }) {
  const { t } = useTranslation("sale");
  const [note, setNote] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    setNote("");
    setError(false);
    onOpenChange(false);
  };

  const confirm = async () => {
    if (noteMode === "required" && !note.trim()) {
      setError(true);
      return;
    }
    setBusy(true);
    try {
      await onConfirm(note.trim());
      close();
    } catch {
      // the caller shows the error; the dialog stays open so nothing is lost
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {noteMode ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="action-note" className="text-sm font-semibold text-muted-foreground">
              {noteMode === "required" ? t("dialog.reasonLabel") : t("dialog.noteLabel")}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                ({noteMode === "required" ? t("dialog.required") : t("dialog.optional")})
              </span>
            </label>
            <Textarea
              id="action-note"
              value={note}
              aria-invalid={error || undefined}
              aria-describedby={error ? "action-note-error" : undefined}
              onChange={(event) => {
                setNote(event.target.value);
                setError(false);
              }}
            />
            {error ? (
              <p id="action-note-error" role="alert" className="text-sm text-destructive">
                {t("dialog.reasonRequired")}
              </p>
            ) : null}
          </div>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("dialog.cancel")}</AlertDialogCancel>
          <Button variant={danger ? "destructive" : "default"} disabled={busy} onClick={confirm}>
            {busy ? t("dialog.working") : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
