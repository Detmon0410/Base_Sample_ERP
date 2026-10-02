import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlertIcon } from "lucide-react";
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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values) => {
    setServerErrorCode(null);
    try {
      // On success GuestRoute sees the new session and redirects, so nothing else to do.
      await login(values);
    } catch (error) {
      setServerErrorCode(error?.code ?? "UNKNOWN_ERROR");
    }
  };

  const serverErrorKey = serverErrorCode
    ? i18n.exists(`auth:errors.${serverErrorCode}`)
      ? `errors.${serverErrorCode}`
      : "errors.UNKNOWN_ERROR"
    : null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-6 py-4">
        <div>
          <h1 className="text-3xl font-bold">{t("login.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("login.subtitle")}</p>
        </div>

        {serverErrorKey ? (
          <Alert variant="destructive" className="p-4 text-base">
            <CircleAlertIcon />
            <AlertTitle className="text-base font-bold">{t("login.errorSummary")}</AlertTitle>
            <AlertDescription className="text-base">{t(serverErrorKey)}</AlertDescription>
          </Alert>
        ) : null}

        <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="email" className="text-base font-semibold">
              {t("login.email")}
            </FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              placeholder={t("login.emailPlaceholder")}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email ? (
              <FieldError id="email-error">{t(errors.email.message)}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={errors.password ? true : undefined}>
            <FieldLabel htmlFor="password" className="text-base font-semibold">
              {t("login.password")}
            </FieldLabel>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...register("password")}
            />
            {errors.password ? (
              <FieldError id="password-error">{t(errors.password.message)}</FieldError>
            ) : null}
            <Button
              type="button"
              variant="link"
              size="sm"
              className="w-fit! self-start px-0"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? t("login.hidePassword") : t("login.showPassword")}
            </Button>
          </Field>

          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("login.submitting") : t("login.submit")}
          </Button>
        </form>

        <p className="text-sm text-muted-foreground">{t("login.help")}</p>
      </CardContent>
    </Card>
  );
}
