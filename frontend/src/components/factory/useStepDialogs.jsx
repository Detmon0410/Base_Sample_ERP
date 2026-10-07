import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ActionDialog } from "@/components/documents/ActionDialog";
import { DoneDialog, StartDialog } from "@/components/factory/StepDialogs";
import { workOrderService } from "@/services/factory.service";
import { notEnoughStockText } from "@/utils/stockErrors";

/**
 * The dialogs of Start / Done / Reopen a step, used by the sheet of a Work Order and by the shop-floor board.
 *   const { open, element } = useStepDialogs({ onChanged })      render {element} once; open("start" | "done" | "reopen", wo, step)
 * `onChanged(workOrder)` is called with the updated Work Order after every successful action.
 */
export function useStepDialogs({ onChanged }) {
  const { t } = useTranslation("factory");
  const [dialog, setDialog] = useState(null); // { mode, wo, step }

  const run = async (action, payload) => {
    try {
      const saved = await workOrderService.stepAction(dialog.wo.id, dialog.step.id, action, payload);
      toast.success(t(`stepDialog.done_${action}`));
      onChanged?.(saved);
      return saved;
    } catch (error) {
      toast.error(notEnoughStockText(error) ?? t(`errors.${error?.code}`, { defaultValue: t("errors.UNKNOWN") }));
      throw error;
    }
  };

  const close = () => setDialog(null);
  let element = null;
  if (dialog?.mode === "start") element = <StartDialog key={dialog.step.id} wo={dialog.wo} step={dialog.step} onClose={close} run={run} />;
  if (dialog?.mode === "done") element = <DoneDialog key={dialog.step.id} wo={dialog.wo} step={dialog.step} onClose={close} run={run} />;
  if (dialog?.mode === "reopen") {
    element = (
      <ActionDialog
        open
        onOpenChange={(open) => !open && close()}
        title={t("stepDialog.reopenTitle", { step: `${dialog.step.stepNo} · ${dialog.step.processName}` })}
        description={t("stepDialog.reopenDescription")}
        confirmLabel={t("stepDialog.reopen")}
        noteMode="required"
        onConfirm={(note) => run("reopen", { note })}
      />
    );
  }
  return { open: (mode, wo, step) => setDialog({ mode, wo, step }), element };
}
