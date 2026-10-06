import { CheckIcon, ListIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EntitySelect } from "@/components/common/EntitySelect";
import { MoneyInput } from "@/components/common/MoneyInput";
import { SheetSection } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOptions } from "@/hooks/useOptions";
import { materialService } from "@/services/material.service";
import { supplierService } from "@/services/supplier.service";
import { supplierMaterialService } from "@/services/supplierMaterial.service";

const toInt = (value) => (value === "" || value == null ? null : Number(value));
const isWhole = (value) => value !== "" && value != null && Number.isInteger(Number(value)) && Number(value) >= 0;

// A cell that looks like plain text until it is hovered or focused (the same as the lines of a quotation).
const PLAIN = "border-transparent bg-transparent hover:border-input hover:bg-card focus-visible:border-input focus-visible:bg-card";
const NEW_ROW = { otherId: "", price: "", lead: "", errors: {} };

/**
 * The materials a supplier sells, or the suppliers of a material: the same links seen from both sides
 * (F3 spec M2 / M4). Every add, change and removal is saved straight away.
 *   mode "supplier": `ownerId` is a supplier, the table lists materials
 *   mode "material": `ownerId` is a material, the table lists suppliers
 *
 * The table looks like the lines of a quotation: numbered rows, the price and the lead time are plain cells you
 * change by clicking them (saved when you leave the cell or press Enter), a red bin removes a row, and "Add a
 * material" opens one more row at the end with a check to save it.
 */
export function SupplierMaterialsTab({ mode, ownerId }) {
  const { t } = useTranslation("master");
  const ownerKey = mode === "supplier" ? "supplierId" : "materialId";
  const otherKey = mode === "supplier" ? "materialId" : "supplierId";
  const otherLabel = t(`links.${mode === "supplier" ? "material" : "supplier"}`);
  const { options, status: optionsStatus } = useOptions(mode === "supplier" ? materialService : supplierService);

  const [state, setState] = useState({ status: "loading", items: [] });
  const [draft, setDraft] = useState(null); // the row being added: { otherId, price, lead, errors }
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return supplierMaterialService
      .list({ [ownerKey]: ownerId })
      .then(({ items }) => setState({ status: "ready", items }))
      .catch(() => setState({ status: "error", items: [] }));
  }, [ownerKey, ownerId]);

  useEffect(() => {
    let cancelled = false;
    supplierMaterialService
      .list({ [ownerKey]: ownerId })
      .then(({ items }) => !cancelled && setState({ status: "ready", items }))
      .catch(() => !cancelled && setState({ status: "error", items: [] }));
    return () => {
      cancelled = true;
    };
  }, [ownerKey, ownerId]);

  const linkedIds = useMemo(() => new Set(state.items.map((item) => item[otherKey])), [state.items, otherKey]);
  const available = useMemo(() => options.filter((option) => !linkedIds.has(option.id)), [options, linkedIds]);

  const errorText = (error) => t(`errors.${error?.code}`, { defaultValue: t("errors.UNKNOWN") });

  const create = async () => {
    const errors = {};
    if (!draft.otherId) errors.other = t("validation.required");
    if (!isWhole(draft.price)) errors.price = t("validation.amountInvalid");
    if (!isWhole(draft.lead)) errors.lead = t("validation.numberInvalid");
    setDraft((current) => ({ ...current, errors }));
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await supplierMaterialService.create({ [ownerKey]: ownerId, [otherKey]: draft.otherId, priceJpy: toInt(draft.price), leadTimeDays: toInt(draft.lead) });
      setDraft(null);
      await load();
      toast.success(t("common.saved"));
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  // A price or a lead time was changed in its cell: save it when the cell is left. A value that is wrong or that
  // did not change is put back.
  const commit = async (item, field, input) => {
    const value = input.value;
    const current = field === "price" ? item.priceJpy : item.leadTimeDays;
    if (String(current) === value) return;
    if (!isWhole(value)) {
      input.value = String(current);
      toast.error(t(field === "price" ? "validation.amountInvalid" : "validation.numberInvalid"));
      return;
    }
    setBusy(true);
    try {
      await supplierMaterialService.update(item.id, { priceJpy: field === "price" ? toInt(value) : item.priceJpy, leadTimeDays: field === "lead" ? toInt(value) : item.leadTimeDays });
      await load();
      toast.success(t("common.saved"));
    } catch (error) {
      input.value = String(current);
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await supplierMaterialService.remove(removing.id);
      setRemoving(null);
      await load();
      toast.success(t("common.deleted"));
    } catch (error) {
      setRemoving(null);
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const otherName = (item) => `${item[mode === "supplier" ? "materialCode" : "supplierCode"]} · ${item[mode === "supplier" ? "materialName" : "supplierName"]}`;
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
        <Button variant="outline" onClick={() => { setState({ status: "loading", items: [] }); load(); }}>
          {t("common.retry")}
        </Button>
      </div>
    );
  }

  const th = "h-10 px-2 text-sm font-semibold";
  const days = t("links.daysUnit");

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <p className="text-muted-foreground">{t(`links.${mode}Hint`)}</p>

      <SheetSection title={t(`links.${mode}ListTitle`)} icon={ListIcon}>
        {state.items.length === 0 && !draft ? (
          <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t(`links.${mode}Empty`)}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full min-w-[34rem] table-fixed text-base">
              <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                <tr className="text-left">
                  <th className={`${th} w-12 text-center`}>{t("links.no")}</th>
                  <th className={th}>{otherLabel}</th>
                  <th className={`${th} w-36 text-right`}>{t("links.price")}</th>
                  <th className={`${th} w-32 text-right`}>{t("links.leadTime")}</th>
                  <th className={`${th} w-20`}>
                    <span className="sr-only">{t("links.actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {state.items.map((item, index) => (
                  <tr key={`${item.id}-${item.priceJpy}-${item.leadTimeDays}`} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                    <td className="px-2 py-2 text-center text-muted-foreground">{index + 1}</td>
                    <td className="px-2 py-2 font-semibold whitespace-normal">{otherName(item)}</td>
                    <td className="px-1 py-1">
                      <MoneyInput
                        aria-label={`${t("links.price")}, ${otherName(item)}`}
                        defaultValue={item.priceJpy}
                        disabled={busy}
                        className={`h-10 ${PLAIN}`}
                        onBlur={(event) => commit(item, "price", event.currentTarget)}
                        onKeyDown={enterToLeave}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          aria-label={`${t("links.leadTime")}, ${otherName(item)}`}
                          defaultValue={item.leadTimeDays}
                          disabled={busy}
                          className={`h-10 text-right ${PLAIN}`}
                          onBlur={(event) => commit(item, "lead", event.currentTarget)}
                          onKeyDown={enterToLeave}
                        />
                        <span className="shrink-0 pr-1 text-sm text-muted-foreground">{days}</span>
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
                            aria-label={`${t("links.remove")} ${otherName(item)}`}
                            onClick={() => setRemoving(item)}
                          >
                            <Trash2Icon />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("links.remove")}</TooltipContent>
                      </Tooltip>
                    </td>
                  </tr>
                ))}

                {draft ? (
                  <tr className="border-t border-slate-200 bg-secondary/40 align-top">
                    <td className="px-2 py-3 text-center text-muted-foreground">{state.items.length + 1}</td>
                    <td className="px-1 py-1">
                      <EntitySelect
                        id="link-other"
                        options={available}
                        value={draft.otherId}
                        onChange={(otherId) => setDraft({ ...draft, otherId })}
                        placeholder={t("links.choose", { name: otherLabel.toLowerCase() })}
                        aria-label={otherLabel}
                        aria-invalid={draft.errors.other ? true : undefined}
                        className="h-10"
                      />
                      {draft.errors.other ? <p className="mt-1 px-1 text-sm text-destructive">{draft.errors.other}</p> : null}
                    </td>
                    <td className="px-1 py-1">
                      <MoneyInput
                        aria-label={t("links.price")}
                        value={draft.price}
                        className="h-10"
                        aria-invalid={draft.errors.price ? true : undefined}
                        onChange={(event) => setDraft({ ...draft, price: event.target.value })}
                      />
                      {draft.errors.price ? <p className="mt-1 px-1 text-sm text-destructive">{draft.errors.price}</p> : null}
                    </td>
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          aria-label={t("links.leadTime")}
                          value={draft.lead}
                          className="h-10 text-right"
                          aria-invalid={draft.errors.lead ? true : undefined}
                          onChange={(event) => setDraft({ ...draft, lead: event.target.value })}
                          onKeyDown={(event) => event.key === "Enter" && create()}
                        />
                        <span className="shrink-0 pr-1 text-sm text-muted-foreground">{days}</span>
                      </div>
                      {draft.errors.lead ? <p className="mt-1 px-1 text-sm text-destructive">{draft.errors.lead}</p> : null}
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
            <Button type="button" variant="outline" onClick={() => setDraft({ ...NEW_ROW })}>
              <PlusIcon aria-hidden="true" /> {t(`links.${mode}Add`)}
            </Button>
          </div>
        ) : null}
      </SheetSection>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t("links.removeTitle")}
        description={t("links.removeDescription")}
        confirmLabel={t("links.remove")}
        cancelLabel={t("common.cancel")}
        onConfirm={remove}
        destructive
        busy={busy}
      />
    </div>
  );
}
