import { ClipboardListIcon, PackageCheckIcon, ShieldCheckIcon, TriangleAlertIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { toast } from "sonner";

import { DateField } from "@/components/common/DateField";
import { DetailFields } from "@/components/common/DetailLayout";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { ProgressBar } from "@/components/common/ProgressBar";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { SheetSection } from "@/components/common/SheetSection";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { HistoryCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { PurchaseLinesCard } from "@/components/purchase/PurchaseLinesCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { canDecide, canEditOrder, canReceive, canWork, purchaseOrderActions } from "@/config/purchase";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { materialService } from "@/services/material.service";
import { purchaseOrderService } from "@/services/purchase.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { supplierMaterialService } from "@/services/supplierMaterial.service";
import { supplierService } from "@/services/supplier.service";
import { addDaysIso } from "@/utils/dates";
import { formatDate, formatDateTime, formatNumber } from "@/utils/format";
import { notEnoughStockText } from "@/utils/stockErrors";

import { emptyPurchaseOrder, purchaseOrderSchema, toFormValues, toPayload } from "./purchaseOrderSchema";

/** P3 + P4 — /purchase/orders/new and /:id. A draft is editable, every other status is read only. */
export function PurchaseOrderSheet() {
  const { t, i18n } = useTranslation(["purchase", "nav", "sale"]);
  const language = i18n.language;
  const { user } = useAuth();
  const { state: prefill } = useLocation();
  const page = useRecordForm({
    service: purchaseOrderService,
    schema: purchaseOrderSchema,
    emptyValues: emptyPurchaseOrder(prefill),
    toValues: toFormValues,
    toPayload,
    listPath: "/purchase/orders",
    idPrefix: "po",
    afterCreatePath: (po) => `/purchase/orders/${po.id}`,
  });
  const { isNew, form, errors, message, fieldProps } = page;
  // while a saved record is still loading the page gives an empty object: treat it as no record yet
  const record = page.record?.id != null ? page.record : null;
  const editable = isNew ? canWork(user) : Boolean(record && canEditOrder(record, user));
  const actions = !isNew && record ? purchaseOrderActions(record, user) : [];

  const { options: suppliers } = useOptions(supplierService, { enabled: editable });
  const { options: materials } = useOptions(materialService, { enabled: editable });
  const { options: warehouses } = useOptions(simpleMasterServices.warehouses, { enabled: editable });
  const rawWarehouses = useMemo(() => warehouses.filter((warehouse) => warehouse.type === "RAW_MATERIAL"), [warehouses]);
  const supplierId = useWatch({ control: form.control, name: "supplierId" });
  const lines = useWatch({ control: form.control, name: "lines" });
  const warehouseId = useWatch({ control: form.control, name: "warehouseId" });
  const date = useWatch({ control: form.control, name: "date" });

  // the materials of the chosen supplier with their price and lead time (the supplier-material links of the master data)
  const [links, setLinks] = useState([]);
  useEffect(() => {
    if (!editable || supplierId == null) return undefined;
    let cancelled = false;
    supplierMaterialService
      .list({ supplierId })
      .then(({ items }) => !cancelled && setLinks(items))
      .catch(() => !cancelled && setLinks([]));
    return () => {
      cancelled = true;
    };
  }, [editable, supplierId]);
  const supplied = useMemo(
    () => (supplierId == null ? [] : links.filter((link) => link.supplierId === supplierId).map((link) => ({ ...(materials.find((material) => material.id === link.materialId) ?? { id: link.materialId, code: link.materialCode, name: link.materialName, uom: link.uom }), price: link.priceJpy, leadTimeDays: link.leadTimeDays }))),
    [links, materials, supplierId],
  );

  // the receiving warehouse: the only raw material warehouse is chosen for the user
  useEffect(() => {
    if (editable && isNew && warehouseId == null && rawWarehouses.length === 1) form.setValue("warehouseId", rawWarehouses[0].id, { shouldDirty: false });
  }, [editable, isNew, warehouseId, rawWarehouses, form]);

  // a new supplier: lines of materials it does not sell are emptied, the others get its price (unless typed by hand)
  const onSupplierChanged = (nextId) => {
    form.setValue("supplierId", nextId, { shouldDirty: true });
    for (const [index, line] of (form.getValues("lines") ?? []).entries()) {
      if (line.materialId != null) {
        form.setValue(`lines.${index}.materialId`, null, { shouldDirty: true });
        form.setValue(`lines.${index}.priceEdited`, false);
      }
    }
  };
  const onMaterialPicked = useCallback(
    (index, materialId) => {
      const found = supplied.find((material) => material.id === materialId);
      if (found && !form.getValues(`lines.${index}.priceEdited`)) form.setValue(`lines.${index}.unitPrice`, found.price, { shouldDirty: true });
    },
    [supplied, form],
  );
  // a prefilled PO (from the stock status board) has its prices from the links already; once the links are loaded fill the empty ones
  useEffect(() => {
    if (!editable || supplied.length === 0) return;
    (form.getValues("lines") ?? []).forEach((line, index) => {
      const found = supplied.find((material) => material.id === line.materialId);
      if (found && line.unitPrice == null) form.setValue(`lines.${index}.unitPrice`, found.price, { shouldDirty: false });
    });
  }, [editable, supplied, form]);

  // expected delivery: the date plus the longest lead time of the lines, until the user types one
  const expectedDirty = form.formState.dirtyFields.expectedDate;
  useEffect(() => {
    if (!editable || expectedDirty || !date) return;
    const leads = (lines ?? []).map((line) => supplied.find((material) => material.id === line.materialId)?.leadTimeDays).filter((days) => days != null);
    if (leads.length === 0) return;
    const suggested = addDaysIso(date, Math.max(...leads));
    if (form.getValues("expectedDate") !== suggested) form.setValue("expectedDate", suggested, { shouldDirty: false });
  }, [editable, expectedDirty, date, lines, supplied, form]);

  const run = async (action, note) => {
    try {
      const saved = await purchaseOrderService.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`purchase:actions.${action.key}.done`));
    } catch (error) {
      toast.error(notEnoughStockText(error) ?? t(`purchase:errors.${error?.code}`, { defaultValue: t("purchase:errors.UNKNOWN") }));
      throw error;
    }
  };

  const numberAside = !isNew && record ? (
    <span className="flex shrink-0 items-center gap-3">
      <span>{record.number}</span>
      <DocumentStatusBadge status={record.status} />
    </span>
  ) : null;

  const headerActions = (
    <>
      {record && canReceive(record, user) ? (
        <Button asChild size="sm" className="h-9" disabled={form.formState.isDirty}>
          <Link to="/purchase/receipts/new" state={{ poId: record.id }}>
            <PackageCheckIcon aria-hidden="true" /> {t("purchase:orders.receiveGoods")}
          </Link>
        </Button>
      ) : null}
      <DocumentActions namespace="purchase" actions={actions} onRun={run} disabled={form.formState.isDirty} />
    </>
  );

  const supplierInfo = record ? (
    <p className="text-sm text-muted-foreground">
      {[record.supplierContact, record.supplierAddress].filter(Boolean).join(" · ") || t("purchase:orders.noContact")}
    </p>
  ) : null;

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.purchaseOrders")}
      newTitle={t("purchase:orders.new")}
      titleOf={(po) => po.number}
      heading={isNew ? t("purchase:orders.new") : t(editable ? "purchase:orders.edit" : "purchase:orders.view")}
      status={record?.status}
      singular={t("purchase:orders.singular")}
      formId="po-form"
      canEdit={editable}
      actions={headerActions}
    >
      <SheetFormBody>
        <form id="po-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {record?.progress.late ? (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 font-semibold text-warning">
              <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" /> {t("purchase:orders.late", { count: record.progress.lateDays })}
            </p>
          ) : null}

          {editable ? (
            <FormSection title={t("purchase:cards.order")} icon={ClipboardListIcon} aside={numberAside}>
              <FormField id="po-supplierId" label={t("purchase:fields.supplier")} required error={message(errors.supplierId)} className="@lg:col-span-2">
                <Controller
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <EntitySelect id="po-supplierId" options={suppliers} value={field.value} placeholder={t("purchase:fields.chooseSupplier")} {...fieldProps("supplierId")} onChange={onSupplierChanged} />
                  )}
                />
              </FormField>
              <FormField id="po-date" label={t("purchase:fields.date")} required error={message(errors.date)}>
                <DateField id="po-date" control={form.control} name="date" clearable={false} {...fieldProps("date")} />
              </FormField>
              <FormField id="po-expectedDate" label={t("purchase:fields.expectedDate")} error={message(errors.expectedDate)} hint={t("purchase:fields.expectedHint")}>
                <DateField id="po-expectedDate" control={form.control} name="expectedDate" min={date || undefined} {...fieldProps("expectedDate")} />
              </FormField>
              <FormField id="po-warehouseId" label={t("purchase:fields.warehouse")} required error={message(errors.warehouseId)}>
                <Controller
                  control={form.control}
                  name="warehouseId"
                  render={({ field }) => <EntitySelect id="po-warehouseId" options={rawWarehouses} value={field.value} onChange={field.onChange} placeholder={t("purchase:fields.chooseWarehouse")} {...fieldProps("warehouseId")} />}
                />
              </FormField>
              <FormField id="po-buyer" label={t("purchase:fields.buyer")}>
                <p id="po-buyer" className="flex h-11 items-center rounded-lg bg-muted px-3 text-base">
                  {record?.buyer ?? user?.name}
                </p>
              </FormField>
              <FormField id="po-remarks" label={t("purchase:fields.remarks")} error={message(errors.remarks)} className="@lg:col-span-2">
                <Textarea id="po-remarks" {...fieldProps("remarks")} {...form.register("remarks")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t("purchase:cards.order")} icon={ClipboardListIcon} aside={numberAside}>
              <DetailFields
                items={[
                  { label: t("purchase:fields.supplier"), value: `${record.supplierCode} · ${record.supplierName}` },
                  { label: t("purchase:fields.date"), value: formatDate(record.date, language) },
                  { label: t("purchase:fields.expectedDate"), value: record.expectedDate ? formatDate(record.expectedDate, language) : "—" },
                  { label: t("purchase:fields.warehouse"), value: record.warehouseName },
                  { label: t("purchase:fields.buyer"), value: record.buyer },
                  { label: t("purchase:fields.supplierContact"), value: supplierInfo, wide: true },
                  { label: t("purchase:fields.remarks"), value: record.remarks, wide: true },
                ]}
              />
              {!["draft", "pending", "rejected", "approved"].includes(record.status) ? (
                <div className="mt-5">
                  <ProgressBar
                    value={record.progress.received}
                    max={record.progress.ordered}
                    label={t("purchase:orders.received", { received: formatNumber(record.progress.received, language), ordered: formatNumber(record.progress.ordered, language) })}
                    tone={["received", "closed"].includes(record.status) && record.progress.percent >= 100 ? "success" : record.progress.late ? "warning" : "primary"}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">{t("purchase:orders.received", { received: formatNumber(record.progress.received, language), ordered: formatNumber(record.progress.ordered, language) })}</p>
                </div>
              ) : null}
            </SheetSection>
          ) : null}

          <PurchaseLinesCard form={form} materials={supplied} supplierChosen={supplierId != null} readOnly={!editable} rows={record?.lines} onMaterialPicked={onMaterialPicked} />
        </form>

        {!isNew && record ? (
          <>
            <SheetSection title={t("purchase:approval.title")} icon={ShieldCheckIcon}>
              <p className="m-0 text-sm text-muted-foreground">{t("purchase:approval.reference")}</p>
              {record.status === "pending" ? (
                <p role="status" className="m-0 mt-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 font-semibold text-warning">
                  {t(canDecide(record, user) || record.createdById !== user?.id ? "purchase:approval.waiting" : "purchase:approval.waitingOwn")}
                </p>
              ) : null}
              {record.approvals.length === 0 ? (
                <p className="m-0 mt-3 text-muted-foreground">{t("purchase:approval.none")}</p>
              ) : (
                <ul className="m-0 mt-3 list-none divide-y divide-slate-200/70 p-0">
                  {record.approvals.map((entry) => (
                    <li key={entry.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0">
                      <span className="min-w-36 font-semibold">{t(`purchase:approval.log.${entry.action}`)}</span>
                      <span>{entry.actor}</span>
                      <span className="text-muted-foreground">{formatDateTime(entry.at, language)}</span>
                      <DocumentStatusBadge status={entry.status} />
                      {entry.note ? <span className="basis-full rounded-lg bg-muted px-3 py-2 text-sm">{entry.note}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </SheetSection>
            {record.receipts.length > 0 ? (
              <SheetSection title={t("purchase:cards.receipts")} icon={PackageCheckIcon}>
                <ul className="divide-y divide-slate-200/70">
                  {record.receipts.map((receipt) => (
                    <li key={receipt.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <Link to={`/purchase/receipts/${receipt.id}`} className="font-semibold text-primary underline-offset-2 hover:underline">
                        {receipt.number}
                      </Link>
                      <span className="text-muted-foreground">{formatDate(receipt.date, language)}</span>
                      <span>{t("purchase:orders.acceptedQty", { qty: formatNumber(receipt.accepted, language) })}</span>
                      <DocumentStatusBadge status={receipt.status} />
                    </li>
                  ))}
                </ul>
              </SheetSection>
            ) : null}
            <HistoryCard history={record.history} />
          </>
        ) : null}
      </SheetFormBody>
    </DocumentSheet>
  );
}
