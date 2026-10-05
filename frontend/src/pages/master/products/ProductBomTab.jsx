import { ListIcon, PlusIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EntitySelect } from "@/components/common/EntitySelect";
import { SheetSection } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useOptions } from "@/hooks/useOptions";
import { bomLineService } from "@/services/bomLine.service";
import { materialService } from "@/services/material.service";
import { formatNumber } from "@/utils/format";

// A quantity per unit: above 0, at most 3 decimals.
const qtyError = (value) => {
  const number = Number(value);
  if (value === "" || !Number.isFinite(number) || number <= 0 || Math.round(number * 1000) / 1000 !== number) return true;
  return false;
};

/**
 * M5 — bill of materials of a product: which materials, and how much of each for ONE unit.
 * Every add, change and removal is saved straight away.
 */
export function ProductBomTab({ productId }) {
  const { t, i18n } = useTranslation("master");
  const { options, status: optionsStatus } = useOptions(materialService);

  const [state, setState] = useState({ status: "loading", items: [] });
  const [adding, setAdding] = useState({ materialId: "", qty: "" });
  const [addErrors, setAddErrors] = useState({});
  const [editing, setEditing] = useState(null); // { id, qty, error }
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

  const add = async () => {
    const errors = {};
    if (!adding.materialId) errors.material = t("validation.required");
    if (qtyError(adding.qty)) errors.qty = t("bom.qtyInvalid");
    setAddErrors(errors);
    if (Object.keys(errors).length) return;
    const ok = await run(() => bomLineService.create({ productId, materialId: adding.materialId, qty: Number(adding.qty) }));
    if (ok) setAdding({ materialId: "", qty: "" });
  };

  const saveEdit = async () => {
    if (qtyError(editing.qty)) {
      setEditing({ ...editing, error: t("bom.qtyInvalid") });
      return;
    }
    if (await run(() => bomLineService.update(editing.id, { qty: Number(editing.qty) }))) setEditing(null);
  };

  const remove = async () => {
    await run(() => bomLineService.remove(removing.id), "common.deleted");
    setRemoving(null);
  };

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

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <p className="text-muted-foreground">{t("bom.hint")}</p>

      {state.items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t("bom.empty")}</p>
      ) : (
        <SheetSection title={t("bom.listTitle")} icon={ListIcon}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("links.material")}</TableHead>
              <TableHead className="text-right">{t("bom.qtyPerUnit")}</TableHead>
              <TableHead>{t("bom.unit")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("links.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.items.map((item) => {
              const isEditing = editing?.id === item.id;
              const name = `${item.materialCode} · ${item.materialName}`;
              return (
                <TableRow key={item.id}>
                  <TableCell className="font-semibold whitespace-normal">{name}</TableCell>
                  <TableCell className="text-right">
                    {isEditing ? (
                      <>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          className="text-right"
                          aria-label={t("bom.qtyPerUnit")}
                          aria-invalid={editing.error ? true : undefined}
                          value={editing.qty}
                          onChange={(event) => setEditing({ ...editing, qty: event.target.value, error: undefined })}
                        />
                        {editing.error ? <p className="mt-1 text-left text-sm text-destructive">{editing.error}</p> : null}
                      </>
                    ) : (
                      formatNumber(item.qty, i18n.language)
                    )}
                  </TableCell>
                  <TableCell>{item.uom}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {isEditing ? (
                      <>
                        <Button size="sm" disabled={busy} onClick={saveEdit}>
                          {t("common.save")}
                        </Button>{" "}
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                          {t("common.cancel")}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" aria-label={`${t("common.edit")} ${name}`} onClick={() => setEditing({ id: item.id, qty: String(item.qty) })}>
                          {t("common.edit")}
                        </Button>{" "}
                        <Button size="sm" variant="outline" aria-label={`${t("links.remove")} ${name}`} onClick={() => setRemoving(item)}>
                          {t("links.remove")}
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </SheetSection>
      )}

      <SheetSection title={t("bom.add")} icon={PlusIcon}>
        {optionsStatus === "ready" && available.length === 0 ? (
          <p className="text-muted-foreground">{t("links.nothingToAdd")}</p>
        ) : (
          <div className="grid gap-4 @lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-1.5 @lg:col-span-2">
              <label htmlFor="bom-material" className="text-base font-semibold">
                {t("links.material")}
              </label>
              <EntitySelect
                id="bom-material"
                options={available}
                value={adding.materialId}
                onChange={(materialId) => setAdding({ ...adding, materialId })}
                placeholder={t("links.choose", { name: t("links.material").toLowerCase() })}
                aria-invalid={addErrors.material ? true : undefined}
              />
              {addErrors.material ? <p className="text-sm text-destructive">{addErrors.material}</p> : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bom-qty" className="text-base font-semibold">
                {t("bom.qtyPerUnit")} {unitOf(adding.materialId) ? `(${unitOf(adding.materialId)})` : ""}
              </label>
              <Input
                id="bom-qty"
                type="number"
                step="any"
                min={0}
                className="text-right"
                value={adding.qty}
                aria-invalid={addErrors.qty ? true : undefined}
                onChange={(event) => setAdding({ ...adding, qty: event.target.value })}
              />
              {addErrors.qty ? <p className="text-sm text-destructive">{addErrors.qty}</p> : null}
            </div>
            <div className="flex items-end">
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
