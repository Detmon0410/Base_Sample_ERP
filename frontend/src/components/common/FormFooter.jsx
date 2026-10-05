import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

/**
 * Save / Cancel bar at the bottom of every form page. It sticks to the bottom of the screen so the
 * buttons are always in reach, however long the form is. Extra actions (Deactivate, Delete…) go in
 * `children` and sit on the right. Must be a direct child of the <form>.
 */
export function FormFooter({ isSubmitting = false, onCancel, saveLabel, savingLabel, cancelLabel, children }) {
  const { t } = useTranslation();

  return (
    <div className="sticky bottom-0 -mx-8 mt-2 flex flex-wrap items-center gap-3 border-t bg-card px-8 py-4">
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
