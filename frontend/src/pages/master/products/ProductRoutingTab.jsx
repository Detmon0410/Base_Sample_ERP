import { ArrowDownIcon, ArrowUpIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { CARD_CLASS, SheetSection } from "@/components/common/SheetSection";
import { EntitySelect } from "@/components/common/EntitySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useOptions } from "@/hooks/useOptions";
import { routingStepService } from "@/services/routingStep.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";

/**
 * Routing of a product: the production steps in order (step 1, 2, 3 …), each with a process name and
 * the machine / line that does it. Steps are added at the end, can be moved up or down and removed
 * (the numbers stay consecutive). Every change is saved straight away.
 */
export function ProductRoutingTab({ productId }) {
  const { t } = useTranslation("master");
  const { options: machines } = useOptions(simpleMasterServices.machines);

  const [state, setState] = useState({ status: "loading", items: [] });
  const [adding, setAdding] = useState({ processName: "", machineId: "" });
  const [addError, setAddError] = useState("");
  const [editing, setEditing] = useState(null); // { id, processName, machineId, error }
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      routingStepService
        .list({ productId })
        .then(({ items }) => setState({ status: "ready", items }))
        .catch(() => setState({ status: "error", items: [] })),
    [productId],
  );

  useEffect(() => {
    let cancelled = false;
    routingStepService
      .list({ productId })
      .then(({ items }) => !cancelled && setState({ status: "ready", items }))
      .catch(() => !cancelled && setState({ status: "error", items: [] }));
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const errorText = (error) => t(`errors.${error?.code}`, { defaultValue: t("errors.UNKNOWN") });
  const run = async (action, successKey = "common.saved") => {
    setBusy(true);
    try {
      await action();
      await load();
      toast.success(t(successKey));
      return true;
    } catch (error) {
      toast.error(errorText(error));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async () => {
    if (!adding.processName.trim()) {
      setAddError(t("validation.required"));
      return;
    }
    setAddError("");
    const ok = await run(() =>
      routingStepService.create({ productId, processName: adding.processName.trim(), machineId: adding.machineId || null }),
    );
    if (ok) setAdding({ processName: "", machineId: "" });
  };

  const saveEdit = async () => {
    if (!editing.processName.trim()) {
      setEditing({ ...editing, error: t("validation.required") });
      return;
    }
    const ok = await run(() =>
      routingStepService.update(editing.id, { processName: editing.processName.trim(), machineId: editing.machineId || null }),
    );
    if (ok) setEditing(null);
  };

  const move = (step, direction) => run(() => routingStepService.move(step.id, direction), "routing.moved");
  const remove = async () => {
    await run(() => routingStepService.remove(removing.id), "common.deleted");
    setRemoving(null);
  };

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-3 p-6" aria-busy="true">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div role="alert" className="m-6 flex flex-col items-start gap-3 rounded-xl border bg-card p-6">
        <p>{t("common.loadError")}</p>
        <Button
          variant="outline"
          onClick={() => {
            setState({ status: "loading", items: [] });
            load();
          }}
        >
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const last = state.items.length - 1;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <p className="text-muted-foreground">{t("routing.hint")}</p>

      {state.items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t("routing.empty")}</p>
      ) : (
        <ol className="flex flex-col gap-3" aria-label={t("routing.listLabel")}>
          {state.items.map((step, index) => {
            const isEditing = editing?.id === step.id;
            const label = `${step.stepNo}. ${step.processName}`;
            return (
              <li key={step.id} className={`flex flex-wrap items-center gap-3 p-4 ${CARD_CLASS}`}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground" aria-hidden="true">
                  {step.stepNo}
                </span>
                {isEditing ? (
                  <div className="grid min-w-0 flex-1 gap-3 @lg:grid-cols-2">
                    <div>
                      <Input
                        aria-label={t("routing.processName")}
                        value={editing.processName}
                        aria-invalid={editing.error ? true : undefined}
                        onChange={(event) => setEditing({ ...editing, processName: event.target.value, error: undefined })}
                      />
                      {editing.error ? <p className="mt-1 text-sm text-destructive">{editing.error}</p> : null}
                    </div>
                    <EntitySelect
                      options={machines}
                      value={editing.machineId}
                      onChange={(machineId) => setEditing({ ...editing, machineId })}
                      placeholder={t("routing.noMachine")}
                    />
                  </div>
                ) : (
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words">
                      <span className="sr-only">{t("routing.step")} {step.stepNo}: </span>
                      {step.processName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {step.machineCode ? `${step.machineCode} · ${step.machineName}` : t("routing.noMachine")}
                    </p>
                  </div>
                )}

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" disabled={busy} onClick={saveEdit}>
                        {t("common.save")}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                        {t("common.cancel")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon-sm" variant="outline" disabled={busy || index === 0} aria-label={`${t("routing.moveUp")}: ${label}`} onClick={() => move(step, "up")}>
                        <ArrowUpIcon />
                      </Button>
                      <Button size="icon-sm" variant="outline" disabled={busy || index === last} aria-label={`${t("routing.moveDown")}: ${label}`} onClick={() => move(step, "down")}>
                        <ArrowDownIcon />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label={`${t("common.edit")} ${label}`}
                        onClick={() => setEditing({ id: step.id, processName: step.processName, machineId: step.machineId ?? "" })}
                      >
                        {t("common.edit")}
                      </Button>
                      <Button size="sm" variant="outline" aria-label={`${t("links.remove")} ${label}`} onClick={() => setRemoving(step)}>
                        {t("links.remove")}
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <SheetSection title={t("routing.add")} icon={PlusIcon}>
        <div className="grid gap-4 @lg:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="routing-name" className="text-sm font-semibold text-muted-foreground">
              {t("routing.processName")}
            </label>
            <Input
              id="routing-name"
              value={adding.processName}
              aria-invalid={addError ? true : undefined}
              onChange={(event) => setAdding({ ...adding, processName: event.target.value })}
            />
            {addError ? <p className="text-sm text-destructive">{addError}</p> : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="routing-machine" className="text-sm font-semibold text-muted-foreground">
              {t("routing.machine")}
            </label>
            <EntitySelect
              id="routing-machine"
              options={machines}
              value={adding.machineId}
              onChange={(machineId) => setAdding({ ...adding, machineId })}
              placeholder={t("routing.noMachine")}
            />
          </div>
          <div className="@lg:col-span-2">
            <Button type="button" disabled={busy} onClick={add}>
              <PlusIcon aria-hidden="true" /> {t("routing.addStep")}
            </Button>
          </div>
        </div>
      </SheetSection>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("routing.removeTitle")}
        description={t("routing.removeDescription")}
        confirmLabel={t("links.remove")}
        cancelLabel={t("common.cancel")}
        onConfirm={remove}
        destructive
        busy={busy}
      />
    </div>
  );
}
