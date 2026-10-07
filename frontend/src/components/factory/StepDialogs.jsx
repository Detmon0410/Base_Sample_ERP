import { useState } from "react";
import { useTranslation } from "react-i18next";

import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useOptions } from "@/hooks/useOptions";
import { simpleMasterServices } from "@/services/simpleMaster.service";

const whole = (value) => value !== "" && Number.isInteger(Number(value)) && Number(value) >= 0;

/** Start a step: who works on it and on which machine / line (the routing's machine is the default). */
export function StartDialog({ wo, step, onClose, run }) {
  const { t } = useTranslation("factory");
  const { options: employees } = useOptions(simpleMasterServices.employees);
  const { options: machines } = useOptions(simpleMasterServices.machines);
  const [operatorId, setOperatorId] = useState("");
  const [machineId, setMachineId] = useState(step.machineId ?? "");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const early = !step.canStart; // a Manager starts it before the step before is done: a reason is needed

  const submit = async () => {
    const next = {};
    if (!operatorId) next.operator = t("validation.required");
    if (early && !note.trim()) next.note = t("validation.required");
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await run("start", { operatorId, machineId: machineId || null, note: note.trim() });
      onClose();
    } catch {
      /* the caller showed the error; the dialog stays open */
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("stepDialog.startTitle", { step: `${step.stepNo} · ${step.processName}` })}</AlertDialogTitle>
          <AlertDialogDescription>{t("stepDialog.startDescription", { number: wo.number })}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-4">
          <FormField id="step-operator" label={t("stepDialog.operator")} required error={errors.operator}>
            <EntitySelect id="step-operator" options={employees} value={operatorId} onChange={setOperatorId} placeholder={t("stepDialog.chooseOperator")} aria-invalid={errors.operator ? true : undefined} />
          </FormField>
          <FormField id="step-machine" label={t("stepDialog.machine")}>
            <EntitySelect id="step-machine" options={machines} value={machineId} onChange={setMachineId} placeholder={t("steps.noMachine")} />
          </FormField>
          {early ? (
            <>
              <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t("stepDialog.early")}
              </p>
              <FormField id="step-note" label={t("stepDialog.reason")} required error={errors.note}>
                <Textarea id="step-note" value={note} onChange={(event) => setNote(event.target.value)} aria-invalid={errors.note ? true : undefined} />
              </FormField>
            </>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("stepDialog.cancel")}</AlertDialogCancel>
          <Button type="button" disabled={busy} onClick={submit}>
            {busy ? t("stepDialog.working") : t("stepDialog.start")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Finish a step: how many came out good and how many were defects (the work order quantity is the default). */
export function DoneDialog({ wo, step, onClose, run }) {
  const { t } = useTranslation("factory");
  const [qtyDone, setQtyDone] = useState(String(wo.qty));
  const [qtyDefect, setQtyDefect] = useState("0");
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next = {};
    if (!whole(qtyDone) || Number(qtyDone) > wo.qty) next.qtyDone = t("validation.qty", { max: wo.qty });
    if (!whole(qtyDefect) || Number(qtyDefect) > wo.qty) next.qtyDefect = t("validation.qty", { max: wo.qty });
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await run("done", { qtyDone: Number(qtyDone), qtyDefect: Number(qtyDefect) });
      onClose();
    } catch {
      /* the caller showed the error; the dialog stays open */
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("stepDialog.doneTitle", { step: `${step.stepNo} · ${step.processName}` })}</AlertDialogTitle>
          <AlertDialogDescription>{t("stepDialog.doneDescription", { number: wo.number, qty: wo.qty, uom: wo.uom })}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="step-qty-done" label={t("stepDialog.qtyDone")} required error={errors.qtyDone}>
            <Input id="step-qty-done" type="number" min={0} step={1} inputMode="numeric" autoFocus className="text-right" value={qtyDone} aria-invalid={errors.qtyDone ? true : undefined} onChange={(event) => setQtyDone(event.target.value)} />
          </FormField>
          <FormField id="step-qty-defect" label={t("stepDialog.qtyDefect")} required error={errors.qtyDefect}>
            <Input id="step-qty-defect" type="number" min={0} step={1} inputMode="numeric" className="text-right" value={qtyDefect} aria-invalid={errors.qtyDefect ? true : undefined} onChange={(event) => setQtyDefect(event.target.value)} />
          </FormField>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("stepDialog.cancel")}</AlertDialogCancel>
          <Button type="button" disabled={busy} onClick={submit}>
            {busy ? t("stepDialog.working") : t("stepDialog.done")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

