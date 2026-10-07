import { ClipboardCheckIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router";
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
import { SignedQty } from "@/components/stock/SignedQty";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ADJUSTMENT_REASONS, adjustmentActions, canEditAdjustment, canWork, OPENING_REASON } from "@/config/stock";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { materialService } from "@/services/material.service";
import { productService } from "@/services/product.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { adjustmentService, getOnHand } from "@/services/stock.service";
import { formatDate, formatNumber } from "@/utils/format";
import { notEnoughStockText } from "@/utils/stockErrors";

import { adjustmentSchema, emptyAdjustment, toFormValues } from "./adjustmentSchema";

const warehouseType = (kind) => (kind === "product" ? "FINISHED_GOODS" : "RAW_MATERIAL");

/** T3 — /stock/adjustments/new and /:id. A count that differs from the stock; a Manager approves it and only then the stock changes. */
export function AdjustmentSheet() {
  const { t, i18n } = useTranslation(["stock", "nav", "sale"]);
  const language = i18n.language;
  const { user } = useAuth();
  const { state: prefill } = useLocation();
  const page = useRecordForm({
    service: adjustmentService,
    schema: adjustmentSchema,
    emptyValues: emptyAdjustment(prefill),
    toValues: toFormValues,
    listPath: "/stock/adjustments",
    idPrefix: "adj",
    afterCreatePath: (adjustment) => `/stock/adjustments/${adjustment.id}`,
  });
  const { isNew, form, errors, message, fieldProps } = page;
  // while a saved record is still loading the page gives an empty object: treat it as no record yet
  const record = page.record?.id != null ? page.record : null;
  const editable = isNew ? canWork(user) : Boolean(record && canEditAdjustment(record, user));
  const actions = !isNew && record ? adjustmentActions(record, user) : [];

  const itemType = useWatch({ control: form.control, name: "itemType" });
  const itemId = useWatch({ control: form.control, name: "itemId" });
  const warehouseId = useWatch({ control: form.control, name: "warehouseId" });
  const counted = useWatch({ control: form.control, name: "countedQty" });
  const reason = useWatch({ control: form.control, name: "reason" });

  const { options: materials } = useOptions(materialService, { enabled: editable });
  const { options: products } = useOptions(productService, { enabled: editable });
  const { options: warehouses } = useOptions(simpleMasterServices.warehouses, { enabled: editable });
  const itemOptions = itemType === "product" ? products : materials;
  const warehouseOptions = useMemo(() => warehouses.filter((warehouse) => warehouse.type === warehouseType(itemType)), [warehouses, itemType]);
  const item = itemOptions.find((option) => option.id === itemId);

  // a warehouse is chosen for the user when there is only one of the right kind (the item sheet sends only the item)
  useEffect(() => {
    if (!editable || !isNew || warehouseId != null || warehouseOptions.length !== 1) return;
    form.setValue("warehouseId", warehouseOptions[0].id, { shouldDirty: false });
  }, [editable, isNew, warehouseId, warehouseOptions, form]);

  // what is on hand now in that warehouse, so the difference can be shown before the count is saved
  const [onHand, setOnHand] = useState(null);
  const [hasMovements, setHasMovements] = useState(true);
  useEffect(() => {
    if (!editable || itemId == null || warehouseId == null) return undefined;
    let cancelled = false;
    getOnHand(itemType, itemId, warehouseId)
      .then((result) => {
        if (cancelled) return;
        setOnHand(result.onHand);
        setHasMovements(result.hasMovements);
      })
      .catch(() => !cancelled && setOnHand(null));
    return () => {
      cancelled = true;
    };
  }, [editable, itemType, itemId, warehouseId]);
  const shownOnHand = editable ? (itemId != null && warehouseId != null ? onHand : null) : record?.onHand;
  // the first quantity of an item (no movement yet in that warehouse) can be booked as an opening balance
  const reasons = !hasMovements || reason === OPENING_REASON ? [...ADJUSTMENT_REASONS, OPENING_REASON] : ADJUSTMENT_REASONS;
  const difference = typeof counted === "number" && shownOnHand != null ? Math.round((counted - shownOnHand) * 1000) / 1000 : null;

  const changeKind = (next) => {
    if (next === itemType) return;
    form.setValue("itemType", next, { shouldDirty: true });
    form.setValue("itemId", null, { shouldDirty: true });
    form.setValue("warehouseId", null, { shouldDirty: true });
    setOnHand(null);
  };

  const run = async (action, note) => {
    try {
      const saved = await adjustmentService.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`stock:actions.${action.key}.done`));
    } catch (error) {
      toast.error(notEnoughStockText(error) ?? t(`stock:errors.${error?.code}`, { defaultValue: t("stock:errors.UNKNOWN") }));
      throw error;
    }
  };

  const numberAside = !isNew && record ? (
    <span className="flex shrink-0 items-center gap-3">
      <span>{record.number}</span>
      <DocumentStatusBadge status={record.status} />
    </span>
  ) : null;

  const differenceView = (value, uom) => (value == null ? <span className="text-muted-foreground">—</span> : <SignedQty value={value} uom={uom} language={language} />);

  const readOnly = record ? (
    <>
      <DetailFields
        items={[
          { label: t("stock:fields.item"), value: `${record.itemCode} · ${record.itemName}` },
          { label: t("stock:fields.warehouse"), value: `${record.warehouseCode} · ${record.warehouseName}` },
          { label: t(record.status === "approved" ? "stock:fields.onHandAtApproval" : "stock:fields.onHandNow"), value: `${formatNumber(record.onHand, language)} ${record.uom}` },
          { label: t("stock:fields.counted"), value: `${formatNumber(record.countedQty, language)} ${record.uom}` },
          { label: t("stock:fields.difference"), value: differenceView(record.difference, record.uom) },
          { label: t("stock:fields.reason"), value: t(`stock:reasons.${record.reason}`) },
          { label: t("stock:fields.date"), value: formatDate(record.date, language) },
          { label: t("stock:fields.createdBy"), value: record.createdBy },
          { label: t("stock:fields.remarks"), value: record.remarks, wide: true },
        ]}
      />
      {record.onHandChanged ? (
        <p role="status" className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
          {t("stock:fields.changedWarning", { before: formatNumber(record.onHandAtRequest, language), now: formatNumber(record.onHand, language) })}
        </p>
      ) : null}
    </>
  ) : null;

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.stockAdjustment")}
      newTitle={t("stock:adjustments.new")}
      titleOf={(adjustment) => adjustment.number}
      heading={isNew ? t("stock:adjustments.new") : t(editable ? "stock:adjustments.edit" : "stock:adjustments.view")}
      status={record?.status}
      singular={t("stock:adjustments.singular")}
      formId="adj-form"
      canEdit={editable}
      actions={<DocumentActions namespace="stock" actions={actions} onRun={run} disabled={form.formState.isDirty} />}
    >
      <SheetFormBody>
        <form id="adj-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {editable ? (
            <FormSection title={t("stock:cards.adjustment")} icon={ClipboardCheckIcon} aside={numberAside}>
              {isNew ? (
                <>
                  <FormField id="adj-itemType" label={t("stock:fields.itemType")} className="@lg:col-span-2">
                    <div role="group" aria-label={t("stock:fields.itemType")} className="flex h-11 w-fit overflow-hidden rounded-lg border border-input bg-card">
                      {["material", "product"].map((kind, index) => (
                        <button
                          key={kind}
                          type="button"
                          aria-pressed={itemType === kind}
                          onClick={() => changeKind(kind)}
                          className={`px-5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${itemType === kind ? "bg-secondary font-semibold text-primary" : "text-muted-foreground hover:bg-muted"} ${index > 0 ? "border-l border-input" : ""}`}
                        >
                          {t(`stock:kinds.${kind}`)}
                        </button>
                      ))}
                    </div>
                  </FormField>
                  <FormField id="adj-itemId" label={t("stock:fields.item")} required error={message(errors.itemId)}>
                    <Controller
                      control={form.control}
                      name="itemId"
                      render={({ field }) => <EntitySelect id="adj-itemId" options={itemOptions} value={field.value} onChange={field.onChange} placeholder={t("stock:fields.chooseItem")} {...fieldProps("itemId")} />}
                    />
                  </FormField>
                  <FormField id="adj-warehouseId" label={t("stock:fields.warehouse")} required error={message(errors.warehouseId)}>
                    <Controller
                      control={form.control}
                      name="warehouseId"
                      render={({ field }) => <EntitySelect id="adj-warehouseId" options={warehouseOptions} value={field.value} onChange={field.onChange} placeholder={t("stock:fields.chooseWarehouse")} {...fieldProps("warehouseId")} />}
                    />
                  </FormField>
                </>
              ) : (
                <div className="@lg:col-span-2">
                  <DetailFields
                    items={[
                      { label: t("stock:fields.item"), value: `${record.itemCode} · ${record.itemName}` },
                      { label: t("stock:fields.warehouse"), value: `${record.warehouseCode} · ${record.warehouseName}` },
                    ]}
                  />
                </div>
              )}
              <FormField id="adj-onHand" label={`${t("stock:fields.onHandNow")}${item?.uom || record?.uom ? ` (${item?.uom ?? record?.uom})` : ""}`}>
                <p id="adj-onHand" className="flex h-11 items-center rounded-lg bg-muted px-3 text-base font-semibold">
                  {shownOnHand != null ? formatNumber(shownOnHand, language) : "—"}
                </p>
              </FormField>
              <FormField
                id="adj-countedQty"
                label={t("stock:fields.counted")}
                required
                error={message(errors.countedQty)}
              >
                <Input
                  id="adj-countedQty"
                  type="number"
                  min={0}
                  step={itemType === "product" ? 1 : 0.001}
                  inputMode="decimal"
                  className="text-right"
                  {...fieldProps("countedQty")}
                  {...form.register("countedQty", { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })}
                />
              </FormField>
              <FormField id="adj-difference" label={t("stock:fields.difference")} hint={t("stock:fields.differenceHint")}>
                <p id="adj-difference" className="flex h-11 items-center rounded-lg bg-muted px-3 text-base">
                  {differenceView(difference, item?.uom ?? record?.uom)}
                </p>
              </FormField>
              <FormField id="adj-reason" label={t("stock:fields.reason")} required error={message(errors.reason)} hint={reason === OPENING_REASON ? t("stock:fields.openingHint") : undefined}>
                <Controller
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="adj-reason" className="w-full" {...fieldProps("reason")}>
                        <SelectValue placeholder={t("stock:fields.chooseReason")} />
                      </SelectTrigger>
                      <SelectContent>
                        {reasons.map((key) => (
                          <SelectItem key={key} value={key}>
                            {t(`stock:reasons.${key}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id="adj-date" label={t("stock:fields.date")} required error={message(errors.date)}>
                <DateField id="adj-date" control={form.control} name="date" clearable={false} {...fieldProps("date")} />
              </FormField>
              <FormField id="adj-remarks" label={t(reason === "other" ? "stock:fields.remarksOther" : "stock:fields.remarks")} required={reason === "other"} error={message(errors.remarks)} className="@lg:col-span-2">
                <Textarea id="adj-remarks" {...fieldProps("remarks")} {...form.register("remarks")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t("stock:cards.adjustment")} icon={ClipboardCheckIcon} aside={numberAside}>
              {readOnly}
            </SheetSection>
          ) : null}
        </form>

        {!isNew && record ? (
          <>
            <HistoryCard history={record.history} />
            {record.links.length > 0 ? <LinksCard links={record.links} /> : null}
          </>
        ) : null}
      </SheetFormBody>
    </DocumentSheet>
  );
}
