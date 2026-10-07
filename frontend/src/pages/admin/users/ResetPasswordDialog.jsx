import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { PasswordField } from "@/components/admin/PasswordField";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { userService } from "@/services/users.service";

import { isStrongPassword } from "./userSchema";

/** Reset the password of a user: type one or press Generate. Their open sign-ins end at once. */
export function ResetPasswordDialog({ user, open, onOpenChange, onDone }) {
  const { t } = useTranslation(["users", "master"]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const close = (next) => {
    if (busy) return;
    if (!next) {
      setPassword("");
      setError(null);
    }
    onOpenChange(next);
  };

  const submit = async () => {
    if (!isStrongPassword(password)) {
      setError("users:validation.weakPassword");
      return;
    }
    setBusy(true);
    try {
      await userService.resetPassword(user.id, password);
      toast.success(t("users:form.resetPassword.done", { name: user.name }));
      setPassword("");
      setError(null);
      onOpenChange(false);
      onDone?.();
    } catch (failure) {
      if (failure?.code === "VALIDATION_ERROR") setError("users:validation.weakPassword");
      else toast.error(t(`master:errors.${failure?.code}`, { defaultValue: t("master:errors.UNKNOWN") }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("users:form.resetPassword.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("users:form.resetPassword.description", { name: user.name })}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-2">
          <label htmlFor="reset-password" className="text-sm font-semibold text-muted-foreground">
            {t("users:form.resetPassword.newPassword")}
          </label>
          <PasswordField id="reset-password" value={password} onChange={setPassword} aria-invalid={error ? true : undefined} />
          <p className="m-0 text-sm text-muted-foreground">{t("users:form.password.hint")}</p>
          {error ? <p role="alert" className="m-0 text-sm text-destructive">{t(error)}</p> : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("master:common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            {t("users:form.resetPassword.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
