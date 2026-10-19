import { Dialog as DialogPrimitive } from "radix-ui";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

/**
 * A small window for a short form (a payment, a few fields). `children` are the fields; the buttons are Cancel and one main button
 * (`submitLabel`) that submits the <form>, so the form's own onSubmit does the work. Closing it with Escape or the shade is the same as Cancel.
 */
export function FormDialog({ open, onOpenChange, title, description, submitLabel, onSubmit, submitting = false, children }) {
  const { t } = useTranslation("common");
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-lg">
          <DialogPrimitive.Title className="text-lg font-bold">{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="text-sm text-muted-foreground">{description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            {children}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("actions.saving") : submitLabel}
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
