import { CheckIcon, ListIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { bomLineService } from "@/services/bomLine.service";
import { materialService } from "@/services/material.service";

// A quantity per unit: above 0, at most 3 decimals.
const qtyError = (value) => {
  const number = Number(value);
  if (value === "" || !Number.isFinite(number) || number <= 0 || Math.round(number * 1000) / 1000 !== number) return true;
  return false;
};

// A cell that looks like plain text until it is hovered or focused (the same as the lines of a quotation).
const PLAIN = "border-transparent bg-transparent hover:border-input hover:bg-card focus-visible:border-input focus-visible:bg-card";

/**
 * M5 — bill of materials of a product: which materials, and how much of each for ONE unit.
 * Every add, change and removal is saved straight away. The table looks like the lines of a quotation: numbered
 * rows, the quantity is a plain cell you change by clicking it (saved when you leave it or press Enter), a red bin
 * removes a row, and "Add a material" opens one more row at the end with a check to save it.
 */
export function ProductBomTab({ productId }) {
  const { t } = useTranslation("master");
  const { options, status: optionsStatus } = useOptions(materialService);

  const [state, setState] = useState({ status: "loading", items: [] });
  const [draft, setDraft] = useState(null); // the row being added: { materialId, qty, errors }
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      bomLineService
        .list({ productId })
        .then(({ items }) => setState({ status: "ready", items }))
        .catch(() => setState({ status: "error", items: [] })),
    [productId],
  );

  useEffect(() => {
    let cancelled = false;
    bomLineService
      .list({ productId })
      .then(({ items }) => !cancelled && setState({ status: "ready", items }))
      .catch(() => !cancelled && setState({ status: "error", items: [] }));
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const used = useMemo(() => new Set(state.items.map((item) => item.materialId)), [state.items]);
  const available = useMemo(() => options.filter((option) => !used.has(option.id)), [options, used]);
  const unitOf = (materialId) => options.find((option) => option.id === Number(materialId))?.uom;
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
    const errors = {};
    if (!draft.materialId) errors.material = t("validation.required");
    if (qtyError(draft.qty)) errors.qty = t("bom.qtyInvalid");
    setDraft((current) => ({ ...current, errors }));
    if (Object.keys(errors).length) return;
    if (await run(() => bomLineService.create({ productId, materialId: draft.materialId, qty: Number(draft.qty) }))) setDraft(null);
  };

  // The quantity of a row was changed in its cell: saved when the cell is left. A wrong value is put back.
  const commit = async (item, input) => {
    if (String(item.qty) === input.value) return;
    if (qtyError(input.value)) {
      input.value = String(item.qty);
      toast.error(t("bom.qtyInvalid"));
      return;
    }
    const value = input.value;
    if (!(await run(() => bomLineService.update(item.id, { qty: Number(value) })))) input.value = String(item.qty);
  };

  const remove = async () => {
    await run(() => bomLineService.remove(removing.id), "common.deleted");
    setRemoving(null);
  };

  const enterToLeave = (event) => event.key === "Enter" && event.currentTarget.blur();

  if (state.status === "loading") {
    return (
      <div className="flex flex-col gap-3 p-6" aria-busy="true">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
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

  const th = "h-10 px-2 text-sm font-semibold";

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <p className="text-muted-foreground">{t("bom.hint")}</p>

      <SheetSection title={t("bom.listTitle")} icon={ListIcon}>
        {state.items.length === 0 && !draft ? (
          <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t("bom.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[30rem] table-fixed text-base">
              <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                <tr className="text-left">
                  <th className={`${th} w-12 text-center`}>{t("links.no")}</th>
                  <th className={th}>{t("links.material")}</th>
                  <th className={`${th} w-44 text-right`}>{t("bom.qtyPerUnit")}</th>
                  <th className={`${th} w-20`}>
                    <span className="sr-only">{t("links.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((item, index) => {
                  const name = `${item.materialCode} · ${item.materialName}`;
                  return (
                    <tr key={`${item.id}-${item.qty}`} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                      <td className="px-2 py-2 text-center text-muted-foreground">{index + 1}</td>
                      <td className="px-2 py-2 font-semibold whitespace-normal">{name}</td>
                      <td className="px-1 py-1">
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            step="any"
                            min={0}
                            aria-label={`${t("bom.qtyPerUnit")}, ${name}`}
                            defaultValue={item.qty}
                            disabled={busy}
                            className={`h-10 text-right ${PLAIN}`}
                            onBlur={(event) => commit(item, event.currentTarget)}
                            onKeyDown={enterToLeave}
                          />
                          <span className="w-10 shrink-0 text-sm text-muted-foreground">{item.uom}</span>
                        </div>
                      </td>
                      <td className="px-1 py-1 text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`${t("links.remove")} ${name}`}
                              onClick={() => setRemoving(item)}
                            >
                              <Trash2Icon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{t("links.remove")}</TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  );
                })}

                {draft ? (
                  <tr className="border-t border-slate-200 bg-secondary/40 align-top">
                    <td className="px-2 py-3 text-center text-muted-foreground">{state.items.length + 1}</td>
                    <td className="px-1 py-1">
                      <EntitySelect
                        id="bom-material"
                        options={available}
                        value={draft.materialId}
                        onChange={(materialId) => setDraft({ ...draft, materialId })}
                        placeholder={t("links.choose", { name: t("links.material").toLowerCase() })}
                        aria-label={t("links.material")}
                        aria-invalid={draft.errors.material ? true : undefined}
                        className="h-10"
                      />
                      {draft.errors.material ? <p className="mt-1 px-1 text-sm text-destructive">{draft.errors.material}</p> : null}
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          aria-label={t("bom.qtyPerUnit")}
                          value={draft.qty}
                          className="h-10 text-right"
                          aria-invalid={draft.errors.qty ? true : undefined}
                          onChange={(event) => setDraft({ ...draft, qty: event.target.value })}
                          onKeyDown={(event) => event.key === "Enter" && create()}
                        />
                        <span className="w-10 shrink-0 text-sm text-muted-foreground">{unitOf(draft.materialId) ?? ""}</span>
                      </div>
                      {draft.errors.qty ? <p className="mt-1 px-1 text-sm text-destructive">{draft.errors.qty}</p> : null}
                    </td>
                    <td className="px-1 py-1 text-right whitespace-nowrap">
                      <Button type="button" variant="ghost" size="icon" className="size-9 text-success hover:bg-success/10 hover:text-success" aria-label={t("common.save")} disabled={busy} onClick={create}>
                        <CheckIcon />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="size-9 text-slate-600" aria-label={t("common.cancel")} onClick={() => setDraft(null)}>
                        <XIcon />
                      </Button>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        {optionsStatus === "ready" && available.length === 0 && !draft ? (
          <p className="mt-3 text-muted-foreground">{t("links.nothingToAdd")}</p>
        ) : !draft ? (
          <div className="mt-3">
            <Button type="button" variant="outline" onClick={() => setDraft({ materialId: "", qty: "", errors: {} })}>
              <PlusIcon aria-hidden="true" /> {t("bom.add")}
            </Button>
          </div>
        ) : null}
      </SheetSection>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("bom.removeTitle")}
        description={t("bom.removeDescription")}
        confirmLabel={t("links.remove")}
        cancelLabel={t("common.cancel")}
        onConfirm={remove}
        destructive
        busy={busy}
      />
    </div>
  );
}
