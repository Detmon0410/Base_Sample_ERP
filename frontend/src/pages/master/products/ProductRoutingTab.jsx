import { ArrowDownIcon, ArrowUpIcon, CheckIcon, ListIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EntitySelect } from "@/components/common/EntitySelect";
import { SheetSection } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOptions } from "@/hooks/useOptions";
import { routingStepService } from "@/services/routingStep.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";

// A cell that looks like plain text until it is hovered or focused (the same as the lines of a quotation).
const PLAIN = "border-transparent bg-transparent hover:border-input hover:bg-card focus-visible:border-input focus-visible:bg-card";

function IconButton({ label, onClick, disabled, className, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={`size-9 ${className ?? "text-slate-600"}`} aria-label={label} disabled={disabled} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Routing of a product: the production steps in order (step 1, 2, 3 …), each with a process name and
 * the machine / line that does it. Every change is saved straight away. The table looks like the lines of a
 * quotation: the process name and the machine are plain cells you change by clicking them (the name is saved when
 * you leave it or press Enter, a machine at once), arrows move a step up or down, a red bin removes it (the numbers
 * stay consecutive) and "Add a step" opens one more row at the end with a check to save it.
 */
export function ProductRoutingTab({ productId }) {
  const { t } = useTranslation("master");
  const { options: machines } = useOptions(simpleMasterServices.machines);

  const [state, setState] = useState({ status: "loading", items: [] });
  const [draft, setDraft] = useState(null); // the step being added: { processName, machineId, error }
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

  const create = async () => {
    if (!draft.processName.trim()) {
      setDraft({ ...draft, error: t("validation.required") });
      return;
    }
    if (await run(() => routingStepService.create({ productId, processName: draft.processName.trim(), machineId: draft.machineId || null }))) setDraft(null);
  };

  // The name of a step was changed in its cell: saved when the cell is left. An empty name is put back.
  const commitName = async (step, input) => {
    const value = input.value.trim();
    if (value === step.processName) return;
    if (!value) {
      input.value = step.processName;
      toast.error(t("validation.required"));
      return;
    }
    if (!(await run(() => routingStepService.update(step.id, { processName: value, machineId: step.machineId ?? null })))) input.value = step.processName;
  };

  const changeMachine = (step, machineId) => run(() => routingStepService.update(step.id, { processName: step.processName, machineId: machineId || null }));
  const move = (step, direction) => run(() => routingStepService.move(step.id, direction), "routing.moved");
  const remove = async () => {
    await run(() => routingStepService.remove(removing.id), "common.deleted");
    setRemoving(null);
  };

  const enterToLeave = (event) => event.key === "Enter" && event.currentTarget.blur();

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
  const th = "h-10 px-2 text-sm font-semibold";

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <p className="text-muted-foreground">{t("routing.hint")}</p>

      <SheetSection title={t("routing.listLabel")} icon={ListIcon}>
        {state.items.length === 0 && !draft ? (
          <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t("routing.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[36rem] table-fixed text-base" aria-label={t("routing.listLabel")}>
              <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                <tr className="text-left">
                  <th className={`${th} w-14 text-center`}>{t("links.no")}</th>
                  <th className={th}>{t("routing.processName")}</th>
                  <th className={`${th} w-60`}>{t("routing.machineShort")}</th>
                  <th className={`${th} w-36`}>
                    <span className="sr-only">{t("links.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((step, index) => {
                  const label = `${step.stepNo}. ${step.processName}`;
                  return (
                    <tr key={`${step.id}-${step.processName}-${step.machineId ?? ""}`} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                      <td className="px-2 py-2 text-center font-semibold text-muted-foreground">{step.stepNo}</td>
                      <td className="px-1 py-1">
                        <Input
                          aria-label={`${t("routing.processName")}, ${label}`}
                          defaultValue={step.processName}
                          disabled={busy}
                          className={`h-10 font-semibold ${PLAIN}`}
                          onBlur={(event) => commitName(step, event.currentTarget)}
                          onKeyDown={enterToLeave}
                        />
                      </td>
                      <td className="px-1 py-1">
                        <EntitySelect
                          options={machines}
                          value={step.machineId ?? ""}
                          onChange={(machineId) => changeMachine(step, machineId)}
                          placeholder={t("routing.noMachine")}
                          aria-label={`${t("routing.machine")}, ${label}`}
                          disabled={busy}
                          className={`h-10 ${PLAIN}`}
                        />
                      </td>
                      <td className="px-1 py-1 text-right whitespace-nowrap">
                        <IconButton label={`${t("routing.moveUp")}: ${label}`} disabled={busy || index === 0} onClick={() => move(step, "up")}>
                          <ArrowUpIcon />
                        </IconButton>
                        <IconButton label={`${t("routing.moveDown")}: ${label}`} disabled={busy || index === last} onClick={() => move(step, "down")}>
                          <ArrowDownIcon />
                        </IconButton>
                        <IconButton label={`${t("links.remove")} ${label}`} className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setRemoving(step)}>
                          <Trash2Icon />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}

                {draft ? (
                  <tr className="border-t border-slate-200 bg-secondary/40 align-top">
                    <td className="px-2 py-3 text-center font-semibold text-muted-foreground">{state.items.length + 1}</td>
                    <td className="px-1 py-1">
                      <Input
                        id="routing-name"
                        autoFocus
                        aria-label={t("routing.processName")}
                        placeholder={t("routing.processName")}
                        value={draft.processName}
                        className="h-10"
                        aria-invalid={draft.error ? true : undefined}
                        onChange={(event) => setDraft({ ...draft, processName: event.target.value, error: undefined })}
                        onKeyDown={(event) => event.key === "Enter" && create()}
                      />
                      {draft.error ? <p className="mt-1 px-1 text-sm text-destructive">{draft.error}</p> : null}
                    </td>
                    <td className="px-1 py-1">
                      <EntitySelect
                        id="routing-machine"
                        options={machines}
                        value={draft.machineId}
                        onChange={(machineId) => setDraft({ ...draft, machineId })}
                        placeholder={t("routing.noMachine")}
                        aria-label={t("routing.machine")}
                        className="h-10"
                      />
                    </td>
                    <td className="px-1 py-1 text-right whitespace-nowrap">
                      <IconButton label={t("common.save")} className="text-success hover:bg-success/10 hover:text-success" disabled={busy} onClick={create}>
                        <CheckIcon />
                      </IconButton>
                      <IconButton label={t("common.cancel")} onClick={() => setDraft(null)}>
                        <XIcon />
                      </IconButton>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        {!draft ? (
          <div className="mt-3">
            <Button type="button" variant="outline" onClick={() => setDraft({ processName: "", machineId: "" })}>
              <PlusIcon aria-hidden="true" /> {t("routing.add")}
            </Button>
          </div>
        ) : null}
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
