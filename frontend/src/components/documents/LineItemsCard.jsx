import { ListIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { EntitySelect } from "@/components/common/EntitySelect";
import { MoneyInput } from "@/components/common/MoneyInput";
import { SheetSection } from "@/components/common/SheetSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EMPTY_LINE } from "@/config/sale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/utils/format";

import { DocumentTotals } from "./DocumentTotals";

/**
 * The lines of a quotation or sale order, with totals.
 *   form             react-hook-form methods of the sheet (field array "lines")
 *   products         active products [{ id, code, name }] for the searchable select
 *   readOnly         true = plain table (the document is not a draft)
 *   rows             lines as the server sent them (read-only mode: names and amounts)
 *   showDelivered    adds "Delivered" (sale orders after confirmation)
 *   onProductPicked  (index, productId) => fills the default price of the customer; never overwrites a price
 *                    the user typed (priceEdited)
 */
export function LineItemsCard({ form, products, readOnly = false, rows = [], showDelivered = false, onProductPicked }) {
  const { t, i18n } = useTranslation("sale");
  const { control, register, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watched = useWatch({ control, name: "lines" }) ?? [];
  const lineErrors = formState.errors.lines;
  const money = (value) => formatCurrency(value, i18n.language);

  if (readOnly) {
    return (
      <SheetSection title={t("lines.title")} icon={ListIcon}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">{t("lines.no")}</TableHead>
              <TableHead>{t("lines.product")}</TableHead>
              <TableHead className="text-right">{t("lines.qty")}</TableHead>
              {showDelivered ? <TableHead className="text-right">{t("lines.delivered")}</TableHead> : null}
              <TableHead className="text-right">{t("lines.unitPrice")}</TableHead>
              <TableHead className="text-right">{t("lines.amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((line, index) => (
              <TableRow key={line.productId}>
                <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-semibold whitespace-normal">
                  {line.productCode} <span className="font-normal text-muted-foreground">· {line.productName}</span>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(line.qty, i18n.language)} {line.uom}
                </TableCell>
                {showDelivered ? <TableCell className="text-right">{formatNumber(line.delivered ?? 0, i18n.language)}</TableCell> : null}
                <TableCell className="text-right">{money(line.unitPrice)}</TableCell>
                <TableCell className="text-right">{money(line.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <DocumentTotals lines={rows} />
      </SheetSection>
    );
  }

  const chosen = new Set(watched.map((line) => line?.productId).filter(Boolean));
  const cellError = (index, name) => lineErrors?.[index]?.[name]?.message;

  return (
    <SheetSection title={t("lines.title")} icon={ListIcon}>
      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t("lines.empty")}</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="block w-full text-base @xl:table @xl:table-fixed">
            <thead className="hidden bg-[#EEEEEE] text-[#4C4C4C] @xl:table-header-group">
              <tr className="text-left text-sm font-semibold">
                <th className="h-10 w-12 px-2 text-center">{t("lines.no")}</th>
                <th className="h-10 px-2">{t("lines.product")}</th>
                <th className="h-10 w-24 px-2 text-right">{t("lines.qty")}</th>
                <th className="h-10 w-32 px-2 text-right">{t("lines.unitPrice")}</th>
                <th className="h-10 w-28 px-2 text-right">{t("lines.amount")}</th>
                <th className="h-10 w-12 px-2">
                  <span className="sr-only">{t("lines.remove")}</span>
                </th>
              </tr>
            </thead>
            <tbody className="block @xl:table-row-group">
              {fields.map((field, index) => {
                const line = watched[index] ?? field;
                const amount = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
                const options = products.filter((product) => product.id === line.productId || !chosen.has(product.id));
                const label = (name) => `${t(`lines.${name}`)}, ${t("lines.lineNumber", { number: index + 1 })}`;
                return (
                  <tr key={field.id} className="grid grid-cols-[2rem_4.5rem_minmax(0,1fr)_auto_2.25rem] items-end gap-x-2 border-b border-slate-200 px-2 py-3 align-top last:border-b-0 odd:bg-card even:bg-slate-50 @xl:table-row @xl:px-0 @xl:py-0">
                    <td className="block py-1.5 text-center text-muted-foreground @xl:table-cell @xl:px-2 @xl:py-2">{index + 1}</td>
                    <td className="col-span-4 block py-1.5 @xl:table-cell @xl:px-1 @xl:py-1">
                      <Controller
                        control={control}
                        name={`lines.${index}.productId`}
                        render={({ field: productField }) => (
                          <EntitySelect
                            id={`line-${index}-product`}
                            options={options}
                            value={productField.value}
                            placeholder={t("lines.chooseProduct")}
                            aria-label={label("product")}
                            className="h-11 border-input @xl:border-transparent @xl:bg-transparent @xl:hover:border-input @xl:hover:bg-card @xl:focus-visible:border-input @xl:focus-visible:bg-card @xl:h-10"
                            chevronClassName="@xl:hidden"
                            aria-invalid={cellError(index, "productId") ? true : undefined}
                            onChange={(id) => {
                              productField.onChange(id);
                              onProductPicked?.(index, id);
                            }}
                          />
                        )}
                      />
                      {cellError(index, "productId") ? <p className="mt-1 text-sm text-destructive">{t(cellError(index, "productId"))}</p> : null}
                    </td>
                    <td className="col-start-2 block py-1.5 @xl:table-cell @xl:px-1 @xl:py-1">
                      <span className="mb-1 block text-sm text-muted-foreground @xl:hidden">{t("lines.qty")}</span>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        className="text-right border-input @xl:border-transparent @xl:bg-transparent @xl:hover:border-input @xl:hover:bg-card @xl:focus-visible:border-input @xl:focus-visible:bg-card @xl:h-10"
                        aria-label={label("qty")}
                        aria-invalid={cellError(index, "qty") ? true : undefined}
                        {...register(`lines.${index}.qty`, { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })}
                      />
                      {cellError(index, "qty") ? <p className="mt-1 text-sm text-destructive">{t(cellError(index, "qty"))}</p> : null}
                    </td>
                    <td className="block py-1.5 @xl:table-cell @xl:px-1 @xl:py-1">
                      <span className="mb-1 block text-sm text-muted-foreground @xl:hidden">{t("lines.unitPrice")}</span>
                      <MoneyInput
                        className="border-input @xl:border-transparent @xl:bg-transparent @xl:hover:border-input @xl:hover:bg-card @xl:focus-visible:border-input @xl:focus-visible:bg-card @xl:h-10"
                        aria-label={label("unitPrice")}
                        aria-invalid={cellError(index, "unitPrice") ? true : undefined}
                        {...register(`lines.${index}.unitPrice`, {
                          setValueAs: (value) => (value === "" || value == null ? null : Number(value)),
                          // a price typed by hand is kept when the customer or the product changes later
                          onChange: () => setValue(`lines.${index}.priceEdited`, true, { shouldDirty: true }),
                        })}
                      />
                      {cellError(index, "unitPrice") ? <p className="mt-1 text-sm text-destructive">{t(cellError(index, "unitPrice"))}</p> : null}
                    </td>
                    <td className="block min-w-24 py-1.5 text-right font-semibold whitespace-nowrap @xl:table-cell @xl:px-2 @xl:py-1">
                      <span className="mb-1 block text-sm font-normal text-muted-foreground @xl:hidden">{t("lines.amount")}</span>
                      <span className="flex h-11 items-center justify-end @xl:h-10">{money(amount)}</span>
                    </td>
                    <td className="block py-1.5 text-right @xl:table-cell @xl:px-1 @xl:py-1">
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
        <Button type="button" variant="outline" onClick={() => append({ ...EMPTY_LINE })}>
          <PlusIcon aria-hidden="true" /> {t("lines.add")}
        </Button>
      </div>
      <DocumentTotals lines={watched} />
    </SheetSection>
  );
}
