import { ListIcon, PackageCheckIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { toast } from "sonner";

import { DateField } from "@/components/common/DateField";
import { DetailFields } from "@/components/common/DetailLayout";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { SheetSection } from "@/components/common/SheetSection";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { HistoryCard, LinksCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { canEditReceipt, canWork, receiptActions, REJECT_REASONS, WHOLE_UNITS } from "@/config/purchase";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { goodsReceiptService, purchaseOrderService } from "@/services/purchase.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatDate, formatNumber } from "@/utils/format";
import { notEnoughStockText } from "@/utils/stockErrors";

import { emptyReceipt, lineFromPo, receiptSchema, toFormValues } from "./receiptSchema";

const CELL = "h-10 text-right";

/** P5 — /purchase/receipts/new and /:id. What arrived against a purchase order; only the accepted quantity of a posted receipt enters the stock. */
export function GoodsReceiptSheet() {
  const { t, i18n } = useTranslation(["purchase", "nav", "sale"]);
  const language = i18n.language;
  const { user } = useAuth();
  const { state: prefill } = useLocation();
  const page = useRecordForm({
    service: goodsReceiptService,
    schema: receiptSchema,
    emptyValues: emptyReceipt(prefill),
    toValues: toFormValues,
    listPath: "/purchase/receipts",
    idPrefix: "gr",
    afterCreatePath: (receipt) => `/purchase/receipts/${receipt.id}`,
  });
  const { isNew, form, errors, message, fieldProps } = page;
  // while a saved record is still loading the page gives an empty object: treat it as no record yet
  const record = page.record?.id != null ? page.record : null;
  const editable = isNew ? canWork(user) : Boolean(record && canEditReceipt(record, user));
  const actions = !isNew && record ? receiptActions(record, user) : [];

  const { control } = form;
  const { fields, replace } = useFieldArray({ control, name: "lines" });
  const watched = useWatch({ control, name: "lines" }) ?? [];
  const poId = useWatch({ control, name: "poId" });
  const { options: warehouses } = useOptions(simpleMasterServices.warehouses, { enabled: editable });
  const rawWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.type === "RAW_MATERIAL"), [warehouses]);

  // the POs that can still receive goods (a new receipt picks one) and the chosen PO with its open quantities
  const [receivable, setReceivable] = useState([]);
  useEffect(() => {
    if (!isNew) return undefined;
    let cancelled = false;
    purchaseOrderService
      .list({ receivable: 1, pageSize: 100, sort: "number" })
      .then(({ items }) => !cancelled && setReceivable(items))
      .catch(() => !cancelled && setReceivable([]));
    return () => {
      cancelled = true;
    };
  }, [isNew]);
  const poOptions = useMemo(() => receivable.map((po) => ({ id: po.id, code: po.number, name: po.supplierName })), [receivable]);
  const [po, setPo] = useState(null);
  useEffect(() => {
    if (!isNew || poId == null) return undefined;
    let cancelled = false;
    purchaseOrderService
      .get(poId)
      .then((loaded) => {
        if (cancelled) return;
        setPo(loaded);
        // every open line arrives in full until the user lowers it; the receiving warehouse is the PO's
        replace(loaded.lines.filter((line) => line.open > 0).map(lineFromPo));
        form.setValue("warehouseId", loaded.warehouseId, { shouldDirty: false });
      })
      .catch(() => !cancelled && setPo(null));
    return () => {
      cancelled = true;
    };
  }, [isNew, poId, replace, form]);

  // what each line is: material, unit, ordered and open quantity (from the PO while new, from the receipt once saved)
  const info = useMemo(() => {
    const rows = isNew ? (po?.lines ?? []).map((line) => ({ materialId: line.materialId, code: line.materialCode, name: line.materialName, uom: line.uom, ordered: line.qty, open: line.open })) : (record?.lines ?? []).map((line) => ({ materialId: line.materialId, code: line.materialCode, name: line.materialName, uom: line.uom, ordered: line.ordered, open: line.open }));
    return new Map(rows.map((row) => [row.materialId, row]));
  }, [isNew, po, record]);

  const run = async (action, note) => {
    try {
      const saved = await goodsReceiptService.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`purchase:actions.${action.key}Receipt.done`));
    } catch (error) {
      toast.error(notEnoughStockText(error) ?? t(`purchase:errors.${error?.code === "VALIDATION_ERROR" ? "POST_INVALID" : error?.code}`, { defaultValue: t("purchase:errors.UNKNOWN") }));
      throw error;
    }
  };

  const numberAside = !isNew && record ? (
    <span className="flex shrink-0 items-center gap-3">
      <span>{record.number}</span>
      <DocumentStatusBadge status={record.status} />
    </span>
  ) : null;
  const num = (value) => formatNumber(value, language);
  const reasonText = (line) => (line.rejectReason ? `${t(`purchase:reasons.${line.rejectReason}`)}${line.rejectNote ? ` — ${line.rejectNote}` : ""}` : "—");

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.goodsReceipt")}
      newTitle={t("purchase:receipts.new")}
      titleOf={(receipt) => receipt.number}
      heading={isNew ? t("purchase:receipts.new") : t(editable ? "purchase:receipts.edit" : "purchase:receipts.view")}
      status={record?.status}
      singular={t("purchase:receipts.singular")}
      formId="gr-form"
      canEdit={editable}
      actions={<DocumentActions namespace="purchase" actions={actions.map((action) => ({ ...action, key: action.key === "cancel" ? "cancelReceipt" : action.key === "post" ? "postReceipt" : action.key }))} onRun={(action, note) => run({ ...action, key: action.key === "cancelReceipt" ? "cancel" : "post" }, note)} disabled={form.formState.isDirty} />}
    >
      <SheetFormBody>
        <form id="gr-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {editable ? (
            <FormSection title={t("purchase:cards.receipt")} icon={PackageCheckIcon} aside={numberAside}>
              {isNew ? (
                <FormField id="gr-poId" label={t("purchase:fields.po")} required error={message(errors.poId)} className="@lg:col-span-2" hint={poOptions.length === 0 ? t("purchase:receipts.noOpenPo") : undefined}>
                  <Controller
                    control={control}
                    name="poId"
                    render={({ field }) => <EntitySelect id="gr-poId" options={poOptions} value={field.value} onChange={field.onChange} placeholder={t("purchase:fields.choosePo")} {...fieldProps("poId")} />}
                  />
                </FormField>
              ) : (
                <div className="@lg:col-span-2">
                  <DetailFields
                    items={[
                      { label: t("purchase:fields.po"), value: <Link to={`/purchase/orders/${record.poId}`} className="font-semibold text-primary underline-offset-2 hover:underline">{record.poNumber}</Link> },
                      { label: t("purchase:fields.supplier"), value: `${record.supplierCode} · ${record.supplierName}` },
                    ]}
                  />
                </div>
              )}
              <FormField id="gr-date" label={t("purchase:fields.receiptDate")} required error={message(errors.date)}>
                <DateField id="gr-date" control={control} name="date" clearable={false} {...fieldProps("date")} />
              </FormField>
              <FormField id="gr-warehouseId" label={t("purchase:fields.receivingWarehouse")} required error={message(errors.warehouseId)}>
                <Controller
                  control={control}
                  name="warehouseId"
                  render={({ field }) => <EntitySelect id="gr-warehouseId" options={rawWarehouses} value={field.value} onChange={field.onChange} placeholder={t("purchase:fields.chooseWarehouse")} {...fieldProps("warehouseId")} />}
                />
              </FormField>
              <FormField id="gr-deliveryNoteNo" label={t("purchase:fields.deliveryNoteNo")} error={message(errors.deliveryNoteNo)}>
                <Input id="gr-deliveryNoteNo" {...fieldProps("deliveryNoteNo")} {...form.register("deliveryNoteNo")} />
              </FormField>
              <FormField id="gr-receivedBy" label={t("purchase:fields.receivedBy")}>
                <p id="gr-receivedBy" className="flex h-11 items-center rounded-lg bg-muted px-3 text-base">
                  {record?.receivedBy ?? user?.name}
                </p>
              </FormField>
              <FormField id="gr-remarks" label={t("purchase:fields.remarks")} error={message(errors.remarks)} className="@lg:col-span-2">
                <Textarea id="gr-remarks" {...fieldProps("remarks")} {...form.register("remarks")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t("purchase:cards.receipt")} icon={PackageCheckIcon} aside={numberAside}>
              <DetailFields
                items={[
                  { label: t("purchase:fields.po"), value: <Link to={`/purchase/orders/${record.poId}`} className="font-semibold text-primary underline-offset-2 hover:underline">{record.poNumber}</Link> },
                  { label: t("purchase:fields.supplier"), value: `${record.supplierCode} · ${record.supplierName}` },
                  { label: t("purchase:fields.receiptDate"), value: formatDate(record.date, language) },
                  { label: t("purchase:fields.receivingWarehouse"), value: record.warehouseName },
                  { label: t("purchase:fields.deliveryNoteNo"), value: record.deliveryNoteNo || "—" },
                  { label: t("purchase:fields.receivedBy"), value: record.receivedBy },
                  { label: t("purchase:fields.remarks"), value: record.remarks, wide: true },
                ]}
              />
            </SheetSection>
          ) : null}

          <SheetSection title={t("purchase:cards.receiptLines")} icon={ListIcon}>
            {editable ? (
              fields.length === 0 ? (
                <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t(poId == null ? "purchase:receipts.choosePoFirst" : "purchase:receipts.nothingOpen")}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[60rem] text-base">
                    <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                      <tr className="text-left text-sm font-semibold">
                        <th className="h-10 px-2">{t("purchase:lines.material")}</th>
                        <th className="h-10 w-24 px-2 text-right">{t("purchase:lines.ordered")}</th>
                        <th className="h-10 w-24 px-2 text-right">{t("purchase:lines.open")}</th>
                        <th className="h-10 w-28 px-2 text-right">{t("purchase:lines.delivered")}</th>
                        <th className="h-10 w-28 px-2 text-right">{t("purchase:lines.accepted")}</th>
                        <th className="h-10 w-24 px-2 text-right">{t("purchase:lines.rejected")}</th>
                        <th className="h-10 w-56 px-2">{t("purchase:lines.rejectReason")}</th>
                        <th className="h-10 w-32 px-2">{t("purchase:lines.lot")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const line = watched[index] ?? field;
                        const row = info.get(line.materialId);
                        const rejected = Math.round(((Number(line.delivered) || 0) - (Number(line.accepted) || 0)) * 1000) / 1000;
                        const lineErrors = errors.lines?.[index];
                        const label = (name) => `${t(`purchase:lines.${name}`)}, ${row?.code ?? ""}`;
                        const step = WHOLE_UNITS.includes(row?.uom) ? 1 : 0.001;
                        const toNumber = { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) };
                        return (
                          <tr key={field.id} className="border-b border-slate-200 align-top last:border-b-0 odd:bg-card even:bg-slate-50">
                            <td className="px-2 py-3 font-semibold text-slate-900">
                              {row?.code} <span className="font-normal text-muted-foreground">· {row?.name}</span>
                            </td>
                            <td className="px-2 py-3 text-right whitespace-nowrap">{row ? `${num(row.ordered)} ${row.uom}` : "—"}</td>
                            <td className="px-2 py-3 text-right font-semibold whitespace-nowrap text-amber-700">{row ? num(row.open) : "—"}</td>
                            <td className="px-1 py-1.5">
                              <Input type="number" min={0} step={step} inputMode="decimal" className={CELL} aria-label={label("delivered")} aria-invalid={lineErrors?.delivered ? true : undefined} {...form.register(`lines.${index}.delivered`, toNumber)} />
                              {lineErrors?.delivered ? <p className="mt-1 text-sm text-destructive">{t(lineErrors.delivered.message)}</p> : null}
                            </td>
                            <td className="px-1 py-1.5">
                              <Input type="number" min={0} step={step} inputMode="decimal" className={CELL} aria-label={label("accepted")} aria-invalid={lineErrors?.accepted ? true : undefined} {...form.register(`lines.${index}.accepted`, toNumber)} />
                              {lineErrors?.accepted ? <p className="mt-1 text-sm text-destructive">{t(lineErrors.accepted.message)}</p> : null}
                            </td>
                            <td className={`px-2 py-3 text-right font-semibold whitespace-nowrap ${rejected > 0 ? "text-destructive" : "text-muted-foreground"}`}>{num(Math.max(0, rejected))}</td>
                            <td className="px-1 py-1.5">
                              <Controller
                                control={control}
                                name={`lines.${index}.rejectReason`}
                                render={({ field: reasonField }) => (
                                  <Select value={rejected > 0 ? reasonField.value : ""} onValueChange={reasonField.onChange} disabled={rejected <= 0}>
                                    <SelectTrigger className="w-full" aria-label={label("rejectReason")} aria-invalid={lineErrors?.rejectReason ? true : undefined}>
                                      <SelectValue placeholder={rejected > 0 ? t("purchase:lines.chooseReason") : "—"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {REJECT_REASONS.map((reason) => (
                                        <SelectItem key={reason} value={reason}>
                                          {t(`purchase:reasons.${reason}`)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                              {lineErrors?.rejectReason ? <p className="mt-1 text-sm text-destructive">{t(lineErrors.rejectReason.message)}</p> : null}
                              {rejected > 0 && line.rejectReason === "other" ? (
                                <>
                                  <Input className="mt-1 h-10" placeholder={t("purchase:lines.noteHere")} aria-label={label("rejectNote")} aria-invalid={lineErrors?.rejectNote ? true : undefined} {...form.register(`lines.${index}.rejectNote`)} />
                                  {lineErrors?.rejectNote ? <p className="mt-1 text-sm text-destructive">{t(lineErrors.rejectNote.message)}</p> : null}
                                </>
                              ) : null}
                            </td>
                            <td className="px-1 py-1.5">
                              <Input className="h-10" aria-label={label("lot")} {...form.register(`lines.${index}.lot`)} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[56rem] text-[15px] text-[#666]">
                  <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                    <tr className="text-left text-sm font-semibold">
                      <th className="h-10 px-2">{t("purchase:lines.material")}</th>
                      <th className="h-10 px-2 text-right">{t("purchase:lines.ordered")}</th>
                      <th className="h-10 px-2 text-right">{t("purchase:lines.delivered")}</th>
                      <th className="h-10 px-2 text-right">{t("purchase:lines.accepted")}</th>
                      <th className="h-10 px-2 text-right">{t("purchase:lines.rejected")}</th>
                      <th className="h-10 px-2">{t("purchase:lines.rejectReason")}</th>
                      <th className="h-10 px-2">{t("purchase:lines.lot")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(record?.lines ?? []).map((line) => (
                      <tr key={line.materialId} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                        <td className="px-2 py-2 font-semibold text-slate-900">
                          {line.materialCode} <span className="font-normal text-muted-foreground">· {line.materialName}</span>
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{`${num(line.ordered)} ${line.uom}`}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{num(line.delivered)}</td>
                        <td className="px-2 py-2 text-right font-semibold whitespace-nowrap text-slate-900">{num(line.accepted)}</td>
                        <td className={`px-2 py-2 text-right whitespace-nowrap ${line.rejected > 0 ? "font-semibold text-destructive" : ""}`}>{num(line.rejected)}</td>
                        <td className="px-2 py-2">{reasonText(line)}</td>
                        <td className="px-2 py-2">{line.lot || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {errors.lines?.message || errors.lines?.root?.message ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {t(errors.lines.message ?? errors.lines.root.message)}
              </p>
            ) : null}
          </SheetSection>
        </form>

        {!isNew && record ? (
          <>
            <HistoryCard history={record.history} />
            <LinksCard links={record.links} />
          </>
        ) : null}
      </SheetFormBody>
    </DocumentSheet>
  );
}
