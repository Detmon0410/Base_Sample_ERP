import { useId } from "react";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** A section of a form: a grey band with the title, the fields below it. */
export function Section({ title, icon: Icon, children, className }) {
  return (
    <section className={cn("border border-border bg-card", className)}>
      <h2 className="flex items-center gap-2 bg-muted px-4 py-2 text-base font-bold">
        {Icon ? <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" /> : null}
        {title}
      </h2>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** A label, an underlined input and the error under it (shown only after Save). `error` is the text of the message. */
export function TextField({ label, error, className, id, ...inputProps }) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={fieldId} className="text-sm font-semibold">
        {label}
      </FieldLabel>
      <Input id={fieldId} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : undefined} {...inputProps} />
      {error ? <FieldError id={`${fieldId}-error`}>{error}</FieldError> : null}
    </Field>
  );
}

const SELECT = "h-10 w-full min-w-0 border-0 border-b border-input bg-transparent px-1 text-base outline-none focus-visible:border-b-2 focus-visible:border-primary disabled:opacity-50 aria-invalid:border-destructive";

/** The browser's own select, underlined like the inputs. `options` is [{ value, label }]. */
export function NativeSelect({ options, className, ...props }) {
  return (
    <select className={cn(SELECT, className)} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** A label, a select and the error under it. */
export function SelectField({ label, error, options, className, id, ...selectProps }) {
  const auto = useId();
  const fieldId = id ?? auto;
  return (
    <Field data-invalid={error ? true : undefined} className={className}>
      <FieldLabel htmlFor={fieldId} className="text-sm font-semibold">
        {label}
      </FieldLabel>
      <NativeSelect id={fieldId} options={options} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fieldId}-error` : undefined} {...selectProps} />
      {error ? <FieldError id={`${fieldId}-error`}>{error}</FieldError> : null}
    </Field>
  );
}
