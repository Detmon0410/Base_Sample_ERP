import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon, EyeIcon, EyeOffIcon, FactoryIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";

// Messages are i18n keys, translated when rendered so a language switch updates them.
const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "auth:validation.emailRequired")
    .email("auth:validation.emailInvalid"),
  password: z.string().min(1, "auth:validation.passwordRequired"),
});

export function LoginPage() {
  const { t, i18n } = useTranslation("auth");
  const { login } = useAuth();
  const [serverErrorCode, setServerErrorCode] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const clearServerError = () => setServerErrorCode(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    clearServerError();
    try {
      // On success GuestRoute sees the new session and redirects, so nothing else to do.
      await login(values);
    } catch (error) {
      setServerErrorCode(error?.code ?? "UNKNOWN_ERROR");
    }
  };

  // Wrong e-mail or password is shown right under the e-mail field. Every other server
  // problem (disabled account, network, 500) is not about a field, so it uses the alert.
  const isCredentialError = serverErrorCode === "INVALID_CREDENTIALS";
  const alertKey =
    serverErrorCode && !isCredentialError
      ? i18n.exists(`auth:errors.${serverErrorCode}`)
        ? `errors.${serverErrorCode}`
        : "errors.UNKNOWN_ERROR"
      : null;

  const emailErrorText = errors.email
    ? t(errors.email.message)
    : isCredentialError
      ? t("errors.INVALID_CREDENTIALS")
      : null;
  const emailInvalid = Boolean(errors.email) || isCredentialError;
  const passwordInvalid = Boolean(errors.password) || isCredentialError;

  return (
    <Card className="rounded-2xl border-0 shadow-xl shadow-primary/10 ring-1 ring-border [--card-spacing:--spacing(7)]">
      <CardContent className="flex flex-col gap-5">
        {/* Factory icon is a placeholder for the company logo. */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-xl bg-secondary text-primary"
          >
            <FactoryIcon className="size-7" strokeWidth={1.75} />
          </div>
          <div>
            <h1 className="text-2xl leading-tight font-bold">{t("login.title")}</h1>
            {/* Hidden while the error alert is shown so the card stays within one screen. */}
            {alertKey ? null : (
              <p className="mt-1.5 text-base text-muted-foreground">{t("login.subtitle")}</p>
            )}
          </div>
        </div>

        {alertKey ? (
          <Alert variant="destructive" className="p-3 text-base">
            <CircleAlertIcon />
            <AlertTitle className="text-base font-bold">{t("login.errorSummary")}</AlertTitle>
            <AlertDescription className="text-base">{t(alertKey)}</AlertDescription>
          </Alert>
        ) : null}

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Field data-invalid={emailInvalid ? true : undefined}>
            <FieldLabel htmlFor="email" className="text-base font-semibold">
              {t("login.email")}
            </FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder={t("login.emailPlaceholder")}
              className="h-10"
              aria-invalid={emailInvalid ? true : undefined}
              aria-describedby={emailErrorText ? "email-error" : undefined}
              {...register("email", { onChange: clearServerError })}
            />
            {emailErrorText ? <FieldError id="email-error">{emailErrorText}</FieldError> : null}
          </Field>

          <Field data-invalid={passwordInvalid ? true : undefined}>
            <FieldLabel htmlFor="password" className="text-base font-semibold">
              {t("login.password")}
            </FieldLabel>
            {/* The eye is only shown while focus is inside this wrapper (the field or the eye). */}
            <div className="group/password relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="h-10 pr-12"
                aria-invalid={passwordInvalid ? true : undefined}
                aria-describedby={
                  errors.password ? "password-error" : isCredentialError ? "email-error" : undefined
                }
                {...register("password", { onChange: clearServerError })}
              />
              {/*
                Plain button on purpose: no background or frame on hover or click.
                The focus ring appears for keyboard focus only (focus-visible).
                The text label lives in aria-label / title because the button is icon-only.
              */}
              <button
                type="button"
                className="pointer-events-none absolute inset-y-0 right-0 my-auto grid size-10 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity outline-none group-focus-within/password:pointer-events-auto group-focus-within/password:opacity-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                aria-pressed={showPassword}
                title={showPassword ? t("login.hidePassword") : t("login.showPassword")}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
              </button>
            </div>
            {errors.password ? (
              <FieldError id="password-error">{t(errors.password.message)}</FieldError>
            ) : null}
          </Field>

          <Button type="submit" className="mt-1 h-10 w-full" disabled={isSubmitting}>
            {isSubmitting ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
