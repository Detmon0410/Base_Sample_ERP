import { ListIcon, PlusIcon } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOptions } from "@/hooks/useOptions";
import { materialService } from "@/services/material.service";
import { supplierService } from "@/services/supplier.service";
import { supplierMaterialService } from "@/services/supplierMaterial.service";
import { formatCurrency, formatNumber } from "@/utils/format";

const toInt = (value) => (value === "" || value == null ? null : Number(value));

/**
 * The materials a supplier sells, or the suppliers of a material: the same links seen from both sides
 * (F3 spec M2 / M4). Every add, change and removal is saved straight away.
 *   mode "supplier": `ownerId` is a supplier, the table lists materials
 *   mode "material": `ownerId` is a material, the table lists suppliers
 */
export function SupplierMaterialsTab({ mode, ownerId }) {
  const { t, i18n } = useTranslation("master");
  const ownerKey = mode === "supplier" ? "supplierId" : "materialId";
  const otherKey = mode === "supplier" ? "materialId" : "supplierId";
  const otherLabel = t(`links.${mode === "supplier" ? "material" : "supplier"}`);
  const { options, status: optionsStatus } = useOptions(mode === "supplier" ? materialService : supplierService);

  const [state, setState] = useState({ status: "loading", items: [] });
  const [adding, setAdding] = useState({ otherId: "", price: "", lead: "" });
  const [addErrors, setAddErrors] = useState({});
  const [editing, setEditing] = useState(null); // { id, price, lead }
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
  const validNumbers = (price, lead) => {
    const errors = {};
    if (price === "" || !Number.isInteger(Number(price)) || Number(price) < 0) errors.price = t("validation.amountInvalid");
    if (lead === "" || !Number.isInteger(Number(lead)) || Number(lead) < 0) errors.lead = t("validation.numberInvalid");
    return errors;
  };

  const add = async () => {
    const errors = validNumbers(adding.price, adding.lead);
    if (!adding.otherId) errors.other = t("validation.required");
    setAddErrors(errors);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await supplierMaterialService.create({
        [ownerKey]: ownerId,
        [otherKey]: adding.otherId,
        priceJpy: toInt(adding.price),
        leadTimeDays: toInt(adding.lead),
      });
      setAdding({ otherId: "", price: "", lead: "" });
      await load();
      toast.success(t("common.saved"));
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const saveEdit = async () => {
    const errors = validNumbers(editing.price, editing.lead);
    setEditing((current) => ({ ...current, errors }));
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await supplierMaterialService.update(editing.id, { priceJpy: toInt(editing.price), leadTimeDays: toInt(editing.lead) });
      setEditing(null);
      await load();
      toast.success(t("common.saved"));
    } catch (error) {
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

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <p className="text-muted-foreground">{t(`links.${mode}Hint`)}</p>

      {state.items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t(`links.${mode}Empty`)}</p>
      ) : (
        <SheetSection title={t(`links.${mode}ListTitle`)} icon={ListIcon}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{otherLabel}</TableHead>
              <TableHead className="text-right">{t("links.price")}</TableHead>
              <TableHead className="text-right">{t("links.leadTime")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("links.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.items.map((item) => {
              const isEditing = editing?.id === item.id;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold whitespace-normal">{otherName(item)}</TableCell>
                  {isEditing ? (
                    <>
                      <TableCell>
                        <MoneyInput
                          aria-label={t("links.price")}
                          value={editing.price}
                          aria-invalid={editing.errors?.price ? true : undefined}
                          onChange={(event) => setEditing({ ...editing, price: event.target.value })}
                        />
                        {editing.errors?.price ? <p className="mt-1 text-sm text-destructive">{editing.errors.price}</p> : null}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          className="text-right"
                          aria-label={t("links.leadTime")}
                          value={editing.lead}
                          aria-invalid={editing.errors?.lead ? true : undefined}
                          onChange={(event) => setEditing({ ...editing, lead: event.target.value })}
                        />
                        {editing.errors?.lead ? <p className="mt-1 text-sm text-destructive">{editing.errors.lead}</p> : null}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="sm" disabled={busy} onClick={saveEdit}>
                          {t("common.save")}
                        </Button>{" "}
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                          {t("common.cancel")}
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right">{formatCurrency(item.priceJpy, i18n.language)}</TableCell>
                      <TableCell className="text-right">
                        {t("links.days", { count: item.leadTimeDays, formatted: formatNumber(item.leadTimeDays, i18n.language) })}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          aria-label={`${t("common.edit")} ${otherName(item)}`}
                          onClick={() => setEditing({ id: item.id, price: String(item.priceJpy), lead: String(item.leadTimeDays) })}
                        >
                          {t("common.edit")}
                        </Button>{" "}
                        <Button size="sm" variant="outline" aria-label={`${t("links.remove")} ${otherName(item)}`} onClick={() => setRemoving(item)}>
                          {t("links.remove")}
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </SheetSection>
      )}

      <SheetSection title={t(`links.${mode}Add`)} icon={PlusIcon}>
        {optionsStatus === "ready" && available.length === 0 ? (
          <p className="text-muted-foreground">{t("links.nothingToAdd")}</p>
        ) : (
          <div className="grid gap-4 @lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
            <div className="flex flex-col gap-1.5 @lg:col-span-3">
              <label htmlFor="link-other" className="text-sm font-semibold text-muted-foreground">
                {otherLabel}
              </label>
              <EntitySelect
                id="link-other"
                options={available}
                value={adding.otherId}
                onChange={(otherId) => setAdding({ ...adding, otherId })}
                placeholder={t("links.choose", { name: otherLabel.toLowerCase() })}
                aria-invalid={addErrors.other ? true : undefined}
              />
              {addErrors.other ? <p className="text-sm text-destructive">{addErrors.other}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5 @lg:col-span-2">
              <label htmlFor="link-price" className="text-sm font-semibold text-muted-foreground">
                {t("links.price")}
              </label>
              <MoneyInput
                id="link-price"
                value={adding.price}
                aria-invalid={addErrors.price ? true : undefined}
                onChange={(event) => setAdding({ ...adding, price: event.target.value })}
              />
              {addErrors.price ? <p className="text-sm text-destructive">{addErrors.price}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="link-lead" className="text-sm font-semibold text-muted-foreground">
                {t("links.leadTime")}
              </label>
              <Input
                id="link-lead"
                type="number"
                min={0}
                step={1}
                className="text-right"
                value={adding.lead}
                aria-invalid={addErrors.lead ? true : undefined}
                onChange={(event) => setAdding({ ...adding, lead: event.target.value })}
              />
              {addErrors.lead ? <p className="text-sm text-destructive">{addErrors.lead}</p> : null}
            </div>
            <div className="@lg:col-span-3">
              <Button type="button" disabled={busy} onClick={add}>
                <PlusIcon aria-hidden="true" /> {t("links.add")}
              </Button>
            </div>
          </div>
        )}
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
