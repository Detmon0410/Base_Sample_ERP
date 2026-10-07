import { CheckIcon, ListIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { EntitySelect } from "@/components/common/EntitySelect";
import { MoneyInput } from "@/components/common/MoneyInput";
import { SheetSection } from "@/components/common/SheetSection";
import { DocumentTotals } from "@/components/documents/DocumentTotals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WHOLE_UNITS } from "@/config/purchase";
import { formatCurrency, formatNumber } from "@/utils/format";

/** The amount of a line in yen, rounded like the server does. */
const amountOf = (line) => Math.round((Number(line?.qty) || 0) * (Number(line?.unitPrice) || 0));
/** Lines as the totals footer wants them: one amount per line, already rounded. */
const forTotals = (lines) => (lines ?? []).map((line) => ({ qty: 1, unitPrice: amountOf(line) }));

const EMPTY_PO_LINE = { materialId: null, qty: null, unitPrice: null, priceEdited: false };

const FIELD = "h-10 border-transparent bg-transparent hover:border-input hover:bg-card focus-visible:border-input focus-visible:bg-card";

/**
 * The lines of a purchase order, with the totals. Same look as the lines of a quotation, for materials:
 *   form          react-hook-form methods of the sheet (field array "lines")
 *   materials     the materials the chosen supplier sells: [{ id, code, name, uom, price, leadTimeDays }]
 *   supplierChosen false = the material picker is disabled until a supplier is chosen
 *   readOnly      true = a plain table (the PO is not a draft); `rows` are the lines of the server
 *   onMaterialPicked (index, materialId) => the default price of the supplier is filled in
 */
export function PurchaseLinesCard({ form, materials = [], supplierChosen = true, readOnly = false, rows = [], onMaterialPicked }) {
  const { t, i18n } = useTranslation("purchase");
  const { control, register, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watched = useWatch({ control, name: "lines" }) ?? [];
  const lineErrors = formState.errors.lines;
  const money = (value) => formatCurrency(value, i18n.language);

  if (readOnly) {
    const showReceived = rows.some((line) => line.received > 0) || rows.some((line) => line.open !== line.qty);
    return (
      <SheetSection title={t("lines.title")} icon={ListIcon}>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[40rem] text-[15px] text-[#666]">
            <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
              <tr className="text-left text-sm font-semibold">
                <th className="h-10 w-12 px-2 text-center">{t("lines.no")}</th>
                <th className="h-10 px-2">{t("lines.material")}</th>
                <th className="h-10 px-2 text-right">{t("lines.qty")}</th>
                <th className="h-10 px-2 text-right">{t("lines.unitPrice")}</th>
                <th className="h-10 px-2 text-right">{t("lines.amount")}</th>
                {showReceived ? <th className="h-10 px-2 text-right">{t("lines.received")}</th> : null}
                {showReceived ? <th className="h-10 px-2 text-right">{t("lines.open")}</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((line, index) => (
                <tr key={line.materialId} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                  <td className="px-2 py-2 text-center text-muted-foreground">{index + 1}</td>
                  <td className="px-2 py-2 font-semibold whitespace-normal text-slate-900">
                    {line.materialCode} <span className="font-normal text-muted-foreground">· {line.materialName}</span>
                  </td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{`${formatNumber(line.qty, i18n.language)} ${line.uom}`}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{money(line.unitPrice)}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap">{money(line.amount)}</td>
                  {showReceived ? <td className="px-2 py-2 text-right whitespace-nowrap">{formatNumber(line.received, i18n.language)}</td> : null}
                  {showReceived ? (
                    <td className="px-2 py-2 text-right whitespace-nowrap">
                      {line.open === 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-success">
                          <CheckIcon className="size-4" aria-hidden="true" /> {t("lines.complete")}
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700">{formatNumber(line.open, i18n.language)}</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DocumentTotals lines={forTotals(rows)} />
      </SheetSection>
    );
  }

  const chosen = new Set(watched.map((line) => line?.materialId).filter(Boolean));
  const cellError = (index, name) => lineErrors?.[index]?.[name]?.message;
  const byId = new Map(materials.map((material) => [material.id, material]));

  return (
    <SheetSection title={t("lines.title")} icon={ListIcon}>
      {!supplierChosen ? <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">{t("lines.chooseSupplierFirst")}</p> : null}
      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t("lines.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[40rem] text-base">
            <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
              <tr className="text-left text-sm font-semibold">
                <th className="h-10 w-12 px-2 text-center">{t("lines.no")}</th>
                <th className="h-10 px-2">{t("lines.material")}</th>
                <th className="h-10 w-32 px-2 text-right">{t("lines.qty")}</th>
                <th className="h-10 w-36 px-2 text-right">{t("lines.unitPrice")}</th>
                <th className="h-10 w-32 px-2 text-right">{t("lines.amount")}</th>
                <th className="h-10 w-12 px-2">
                  <span className="sr-only">{t("lines.remove")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const line = watched[index] ?? field;
                const material = byId.get(line.materialId);
                const options = materials.filter((item) => item.id === line.materialId || !chosen.has(item.id));
                const label = (name) => `${t(`lines.${name}`)}, ${t("lines.lineNumber", { number: index + 1 })}`;
                const different = material && line.unitPrice != null && material.price != null && line.unitPrice !== material.price;
                return (
                  <tr key={field.id} className="border-b border-slate-200 align-top last:border-b-0 odd:bg-card even:bg-slate-50">
                    <td className="px-2 py-3 text-center text-muted-foreground">{index + 1}</td>
                    <td className="px-1 py-1.5">
                      <Controller
                        control={control}
                        name={`lines.${index}.materialId`}
                        render={({ field: materialField }) => (
                          <EntitySelect
                            id={`line-${index}-material`}
                            options={options}
                            value={materialField.value}
                            disabled={!supplierChosen}
                            placeholder={t("lines.chooseMaterial")}
                            aria-label={label("material")}
                            className={FIELD}
                            aria-invalid={cellError(index, "materialId") ? true : undefined}
                            onChange={(id) => {
                              materialField.onChange(id);
                              onMaterialPicked?.(index, id);
                            }}
                          />
                        )}
                      />
                      {cellError(index, "materialId") ? <p className="mt-1 px-1 text-sm text-destructive">{t(cellError(index, "materialId"))}</p> : null}
                      {material?.leadTimeDays != null ? <p className="mt-1 px-1 text-sm text-muted-foreground">{t("lines.leadTime", { days: material.leadTimeDays })}</p> : null}
                    </td>
                    <td className="px-1 py-1.5">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          step={WHOLE_UNITS.includes(material?.uom) ? 1 : 0.001}
                          inputMode="decimal"
                          className={`${FIELD} text-right`}
                          aria-label={label("qty")}
                          aria-invalid={cellError(index, "qty") ? true : undefined}
                          {...register(`lines.${index}.qty`, { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })}
                        />
                        {material ? <span className="shrink-0 text-sm text-muted-foreground">{material.uom}</span> : null}
                      </div>
                      {cellError(index, "qty") ? <p className="mt-1 px-1 text-sm text-destructive">{t(cellError(index, "qty"))}</p> : null}
                    </td>
                    <td className="px-1 py-1.5">
                      <MoneyInput
                        className={FIELD}
                        aria-label={label("unitPrice")}
                        aria-invalid={cellError(index, "unitPrice") ? true : undefined}
                        {...register(`lines.${index}.unitPrice`, {
                          setValueAs: (value) => (value === "" || value == null ? null : Number(value)),
                          // a price typed by hand is kept when the supplier or the material changes later
                          onChange: () => setValue(`lines.${index}.priceEdited`, true, { shouldDirty: true }),
                        })}
                      />
                      {different ? <p className="mt-1 px-1 text-sm text-amber-700">{t("lines.listPrice", { price: money(material.price) })}</p> : null}
                      {cellError(index, "unitPrice") ? <p className="mt-1 px-1 text-sm text-destructive">{t(cellError(index, "unitPrice"))}</p> : null}
                    </td>
                    <td className="px-2 py-3 text-right font-semibold whitespace-nowrap">{money(amountOf(line))}</td>
                    <td className="px-1 py-1.5 text-right">
                      <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`${t("lines.remove")}, ${t("lines.lineNumber", { number: index + 1 })}`} onClick={() => remove(index)}>
                        <Trash2Icon />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lineErrors?.message || lineErrors?.root?.message ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {t(lineErrors.message ?? lineErrors.root.message)}
        </p>
      ) : null}

      <div className="mt-3">
        <Button type="button" variant="outline" disabled={!supplierChosen} onClick={() => append({ ...EMPTY_PO_LINE })}>
          <PlusIcon aria-hidden="true" /> {t("lines.add")}
        </Button>
      </div>
      <DocumentTotals lines={forTotals(watched)} />
    </SheetSection>
  );
}
