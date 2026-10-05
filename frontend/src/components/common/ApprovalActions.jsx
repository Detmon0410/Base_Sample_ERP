import { CheckIcon, ClockIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
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
import { useAuth } from "@/hooks/useAuth";
import { canApprove } from "@/utils/permissions";

/**
 * Approve / Reject for a document that is waiting for approval.
 *
 *   department  the department that owns the approval ("Sale", "Factory", "Purchase", "Accounting")
 *   pending     true only while the document is in its "waiting for approval" state
 *   onApprove() / onReject(reason)   async; the dialog closes when they resolve
 *
 * Who sees what (user_account_req.md): Admin and the Manager of that department get the buttons;
 * everyone else sees a plain note that the document is waiting. The server must check the same rule.
 * Reject needs a reason so the requester knows what to change.
 */
export function ApprovalActions({ department, pending, onApprove, onReject }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [dialog, setDialog] = useState(null); // "approve" | "reject" | null
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);

  if (!pending) return null;

  if (!canApprove(user, department)) {
    return (
      <p role="status" className="flex items-center gap-2 rounded-lg border bg-muted px-3 py-2 text-base">
        <ClockIcon className="size-5 shrink-0" aria-hidden="true" />
        {t("approval.waiting", { department: t(`nav:groups.${department.toLowerCase()}`, department) })}
      </p>
    );
  }

  const close = () => {
    setDialog(null);
    setReason("");
    setReasonError(false);
  };

  const run = async (action) => {
    setBusy(true);
    try {
      await action();
      close();
    } finally {
      setBusy(false);
    }
  };

  const submitReject = () => {
    if (!reason.trim()) {
      setReasonError(true);
      return;
    }
    run(() => onReject(reason.trim()));
  };

  return (
    <>
      <Button onClick={() => setDialog("approve")}>
        <CheckIcon aria-hidden="true" /> {t("actions.approve")}
      </Button>
      <Button variant="outline" onClick={() => setDialog("reject")}>
        <XIcon aria-hidden="true" /> {t("actions.reject")}
      </Button>

      <ConfirmDialog
        open={dialog === "approve"}
        onOpenChange={(open) => !open && close()}
        title={t("approval.approveTitle")}
        description={t("approval.approveDescription")}
        confirmLabel={t("actions.approve")}
        cancelLabel={t("actions.cancel")}
        onConfirm={() => run(onApprove)}
        busy={busy}
      />

      <AlertDialog open={dialog === "reject"} onOpenChange={(open) => !open && !busy && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("approval.rejectTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("approval.rejectDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <label htmlFor="reject-reason" className="text-base font-semibold">
              {t("approval.reasonLabel")}
            </label>
            <Textarea
              id="reject-reason"
              value={reason}
              placeholder={t("approval.reasonPlaceholder")}
              aria-invalid={reasonError || undefined}
              aria-describedby={reasonError ? "reject-reason-error" : undefined}
              onChange={(event) => {
                setReason(event.target.value);
                setReasonError(false);
              }}
            />
            {reasonError ? (
              <p id="reject-reason-error" role="alert" className="text-sm text-destructive">
                {t("approval.reasonRequired")}
              </p>
            ) : null}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("actions.cancel")}</AlertDialogCancel>
            <Button variant="destructive" disabled={busy} onClick={submitReject}>
              {t("actions.reject")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
