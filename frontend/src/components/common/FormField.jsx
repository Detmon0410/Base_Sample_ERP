import { useTranslation } from "react-i18next";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

/**
 * Label (always visible), control, hint and error message.
 * Required fields say "(Required)" in words, not only with a mark.
 */
export function FormField({ id, label, required = false, error, hint, className, children }) {
  const { t } = useTranslation("master");

  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={id} className="text-base font-semibold">
        {label}
        {required ? (
          <span className="ml-1.5 text-sm font-normal text-muted-foreground">({t("common.required")})</span>
        ) : null}
      </FieldLabel>
      {children}
      {hint && !error ? <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription> : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
