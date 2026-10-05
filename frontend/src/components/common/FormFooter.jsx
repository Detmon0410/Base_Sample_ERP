import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Save / Cancel bar at the bottom of every form. On a page it sticks to the bottom of the screen so the
 * buttons are always in reach; with `inSheet` it is the fixed bottom row of a DetailSheet. Extra actions
 * (Deactivate, Delete…) go in `children` and sit on the right. Must be a direct child of the <form>.
 */
export function FormFooter({ isSubmitting = false, inSheet = false, onCancel, saveLabel, savingLabel, cancelLabel, children }) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t bg-card py-4",
        inSheet ? "shrink-0 px-6" : "sticky bottom-0 -mx-8 mt-2 px-8",
      )}
    >
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (savingLabel ?? t("actions.saving")) : (saveLabel ?? t("actions.save"))}
      </Button>
      <Button type="button" variant="outline" onClick={onCancel}>
        {cancelLabel ?? t("actions.cancel")}
      </Button>
      {children ? <div className="ml-auto flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}
