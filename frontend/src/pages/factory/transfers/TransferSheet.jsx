import { WarehouseIcon } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canWork, transferActions } from "@/config/factory";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { transferService, workOrderService } from "@/services/factory.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatDate, formatNumber } from "@/utils/format";
import { notEnoughStockText } from "@/utils/stockErrors";

import { emptyTransfer, toFormValues, transferSchema } from "./transferSchema";

/** F5 — /factory/transfers/new and /:id. Finished goods go from a finished Work Order to a finished-goods warehouse. */
export function TransferSheet() {
  const { t, i18n } = useTranslation(["factory", "nav", "sale"]);
  const language = i18n.language;
  const { user } = useAuth();
  const { state: prefill } = useLocation();
  const page = useRecordForm({
    service: transferService,
    schema: transferSchema,
    emptyValues: emptyTransfer(prefill),
    toValues: toFormValues,
    listPath: "/factory/transfers",
    idPrefix: "ft",
    afterCreatePath: (transfer) => `/factory/transfers/${transfer.id}`,
  });
  const { isNew, form, errors, message, fieldProps } = page;
  // while a saved record is still loading the page gives an empty object: treat it as no record yet
  const record = page.record?.id != null ? page.record : null;
  const editable = isNew || (record?.status === "draft" && canWork(user));
  const actions = !isNew && record ? transferActions(record, user) : [];
  const { options: warehouses } = useOptions(simpleMasterServices.warehouses);
  const finishedGoods = warehouses.filter((warehouse) => warehouse.type === "FINISHED_GOODS");

  // the finished work orders that still have pieces to transfer
  const [finished, setFinished] = useState([]);
  useEffect(() => {
    if (!isNew) return undefined;
    let cancelled = false;
    workOrderService
      .list({ status: "finished", pageSize: 100, sort: "number" })
      .then(({ items }) => !cancelled && setFinished(items.filter((wo) => wo.progress.remainingToTransfer > 0)))
      .catch(() => !cancelled && setFinished([]));
    return () => {
      cancelled = true;
    };
  }, [isNew]);
  const woOptions = useMemo(
    () => finished.map((wo) => ({ id: wo.id, code: wo.number, name: `${wo.productCode} · ${wo.productName}`, remaining: wo.progress.remainingToTransfer, uom: wo.uom })),
    [finished],
  );
  const workOrderId = useWatch({ control: form.control, name: "workOrderId" });
  const picked = woOptions.find((option) => option.id === workOrderId);

  // a work order chosen (or sent by the "Create transfer" button): the quantity that is left is the default
  useEffect(() => {
    if (isNew && picked && form.getValues("qty") == null) form.setValue("qty", picked.remaining, { shouldDirty: true });
  }, [isNew, picked, form]);

  const run = async (action, note) => {
    try {
      const saved = await transferService.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`factory:actions.${action.key}.done`));
    } catch (error) {
      toast.error(notEnoughStockText(error) ?? t(`factory:errors.${error?.code}`, { defaultValue: t("factory:errors.UNKNOWN") }));
      throw error;
    }
  };

  const numberAside = !isNew && record ? (
    <span className="flex shrink-0 items-center gap-3">
      <span>{record.number}</span>
      <DocumentStatusBadge status={record.status} />
    </span>
  ) : null;

  const readOnly = record && !isNew ? (
    <DetailFields
      items={[
        { label: t("factory:fields.workOrder"), value: `${record.workOrderNumber} · ${record.saleOrderNumber}` },
        { label: t("factory:fields.product"), value: `${record.productCode} · ${record.productName}` },
        { label: t("factory:fields.qty"), value: `${formatNumber(record.qty, language)} ${record.uom}` },
        { label: t("factory:fields.date"), value: formatDate(record.date, language) },
        { label: t("factory:fields.warehouse"), value: record.warehouseName },
        { label: t("factory:fields.remarks"), value: record.remarks, wide: true },
      ]}
    />
  ) : null;

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.fgTransfer")}
      newTitle={t("factory:transfers.new")}
      titleOf={(transfer) => transfer.number}
      heading={isNew ? t("factory:transfers.new") : t(editable ? "factory:transfers.edit" : "factory:transfers.view")}
      status={record?.status}
      singular={t("factory:transfers.singular")}
      formId="ft-form"
      canEdit={editable}
      actions={<DocumentActions namespace="factory" actions={actions} onRun={run} disabled={form.formState.isDirty} />}
    >
      <SheetFormBody>
        <form id="ft-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {editable ? (
            <FormSection title={t("factory:cards.transfer")} icon={WarehouseIcon} aside={numberAside}>
              {isNew ? (
                <FormField id="ft-workOrderId" label={t("factory:fields.workOrder")} required error={message(errors.workOrderId)} className="@lg:col-span-2">
                  <Controller
                    control={form.control}
                    name="workOrderId"
                    render={({ field }) => (
                      <EntitySelect
                        id="ft-workOrderId"
                        options={woOptions}
                        value={field.value}
                        onChange={(id) => {
                          field.onChange(id);
                          const option = woOptions.find((item) => item.id === id);
                          if (option) form.setValue("qty", option.remaining, { shouldDirty: true });
                        }}
                        placeholder={t("factory:fields.chooseWorkOrder")}
                        {...fieldProps("workOrderId")}
                      />
                    )}
                  />
                </FormField>
              ) : (
                <div className="@lg:col-span-2">
                  <DetailFields
                    items={[
                      { label: t("factory:fields.workOrder"), value: `${record.workOrderNumber} · ${record.saleOrderNumber}` },
                      { label: t("factory:fields.product"), value: `${record.productCode} · ${record.productName}` },
                    ]}
                  />
                </div>
              )}
              <FormField
                id="ft-qty"
                label={`${t("factory:fields.qty")}${picked?.uom ? ` (${picked.uom})` : record?.uom ? ` (${record.uom})` : ""}`}
                required
                error={message(errors.qty)}
                hint={picked ? t("factory:fields.transferHint", { max: formatNumber(picked.remaining, language), uom: picked.uom }) : undefined}
              >
                <Input id="ft-qty" type="number" min={1} step={1} inputMode="numeric" className="text-right" {...fieldProps("qty", Boolean(picked))} {...form.register("qty", { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })} />
              </FormField>
              <FormField id="ft-date" label={t("factory:fields.date")} required error={message(errors.date)}>
                <DateField id="ft-date" control={form.control} name="date" clearable={false} {...fieldProps("date")} />
              </FormField>
              <FormField id="ft-warehouseId" label={t("factory:fields.warehouse")} required error={message(errors.warehouseId)} className="@lg:col-span-2">
                <Controller
                  control={form.control}
                  name="warehouseId"
                  render={({ field }) => <EntitySelect id="ft-warehouseId" options={finishedGoods} value={field.value} onChange={field.onChange} placeholder={t("factory:fields.chooseWarehouse")} {...fieldProps("warehouseId")} />}
                />
              </FormField>
              <FormField id="ft-remarks" label={t("factory:fields.remarks")} error={message(errors.remarks)} className="@lg:col-span-2">
                <Textarea id="ft-remarks" {...fieldProps("remarks")} {...form.register("remarks")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t("factory:cards.transfer")} icon={WarehouseIcon} aside={numberAside}>
              {readOnly}
            </SheetSection>
          ) : null}
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
