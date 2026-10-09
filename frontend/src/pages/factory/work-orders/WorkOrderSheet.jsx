import { ClipboardListIcon, CogIcon, WarehouseIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { DateField } from "@/components/common/DateField";
import { DetailFields } from "@/components/common/DetailLayout";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { SheetSection } from "@/components/common/SheetSection";
import { AvailabilityCard } from "@/components/documents/AvailabilityCard";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { HistoryCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { SerialCard } from "@/components/factory/SerialCard";
import { StepTimeline } from "@/components/factory/StepTimeline";
import { IssuedMaterialsCard } from "@/components/stock/IssuedMaterialsCard";
import { useStepDialogs } from "@/components/factory/useStepDialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canWork, workOrderActions } from "@/config/factory";
import { useAuth } from "@/hooks/useAuth";
import { useRecordForm } from "@/hooks/useRecordForm";
import { checkFactoryAvailability, listWaitingOrders, workOrderService } from "@/services/factory.service";
import { formatDate } from "@/utils/format";
import { notEnoughStockText } from "@/utils/stockErrors";

import { emptyWorkOrder, toFormValues, toPayload, workOrderSchema } from "./workOrderSchema";


/** F2 + F3 — /factory/work-orders/new and /:id as a sheet (a draft is editable, every other status is read-only). */
export function WorkOrderSheet() {
  const { t, i18n } = useTranslation(["factory", "nav", "sale"]);
  const language = i18n.language;
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state: prefill } = useLocation();
  const page = useRecordForm({
    service: workOrderService,
    schema: workOrderSchema,
    emptyValues: emptyWorkOrder(prefill),
    toValues: toFormValues,
    toPayload,
    listPath: "/factory/work-orders",
    idPrefix: "wo",
    afterCreatePath: (wo) => `/factory/work-orders/${wo.id}`,
  });
  const { isNew, form, errors, message, fieldProps } = page;
  // while a saved record is still loading the page gives an empty object: treat it as no record yet
  const record = page.record?.id != null ? page.record : null;
  const editable = isNew || (record?.status === "draft" && canWork(user));
  const actions = !isNew && record ? workOrderActions(record, user) : [];

  // the lines that wait for a work order: the picker of a new one
  const [waiting, setWaiting] = useState([]);
  const [waitingLoaded, setWaitingLoaded] = useState(false);
  useEffect(() => {
    if (!isNew) return undefined;
    let cancelled = false;
    listWaitingOrders()
      .then((orders) => !cancelled && (setWaiting(orders), setWaitingLoaded(true)))
      .catch(() => !cancelled && (setWaiting([]), setWaitingLoaded(true)));
    return () => {
      cancelled = true;
    };
  }, [isNew]);
  const lineOptions = useMemo(
    () =>
      waiting.flatMap((order) =>
        order.lines.map((line) => ({
          id: `${order.id}:${line.productId}`,
          code: order.number,
          name: `${line.productCode} · ${line.productName}`,
          remaining: line.remaining,
          uom: line.uom,
          productId: line.productId,
        })),
      ),
    [waiting],
  );
  const lineValue = useWatch({ control: form.control, name: "line" });
  const qtyValue = useWatch({ control: form.control, name: "qty" });
  const picked = lineOptions.find((option) => option.id === lineValue);
  const lineGone = isNew && waitingLoaded && Boolean(lineValue) && !picked; // this line already has work orders for its whole quantity

  const stepDialogs = useStepDialogs({ onChanged: (saved) => page.applyRecord(saved) });
  const errorText = (error) => {
    // scheduling needs the plan dates: say so, instead of "check the highlighted fields"
    const planMissing = error?.code === "VALIDATION_ERROR" && Array.isArray(error.details) && error.details.some((item) => ["planStart", "planFinish"].includes(item?.path?.[0]));
    if (planMissing) return t("factory:errors.PLAN_DATES");
    return notEnoughStockText(error) ?? t(`factory:errors.${error?.code}`, { defaultValue: t("factory:errors.UNKNOWN") });
  };

  const run = async (action, note) => {
    try {
      const saved = await workOrderService.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`factory:actions.${action.key}.done`));
    } catch (error) {
      toast.error(errorText(error));
      throw error;
    }
  };


  const numberAside = !isNew && record ? (
    <span className="flex shrink-0 items-center gap-3">
      <span>{record.number}</span>
      <DocumentStatusBadge status={record.status} />
    </span>
  ) : null;

  const lines = isNew ? (picked && qtyValue > 0 ? [{ productId: picked.productId, qty: qtyValue }] : []) : record && ["draft", "scheduled"].includes(record.status) ? [{ productId: record.productId, qty: record.qty }] : []; // only before production starts: afterwards it no longer helps
  const canTransfer = !isNew && record?.status === "finished" && record.progress.remainingToTransfer > 0 && canWork(user);

  const headerActions = (
    <>
      {canTransfer ? (
        <Button type="button" variant="secondary" size="sm" className="h-9" disabled={form.formState.isDirty} onClick={() => navigate("/factory/transfers/new", { state: { workOrderId: record.id } })}>
          <WarehouseIcon aria-hidden="true" /> {t("factory:workOrders.createTransfer")}
        </Button>
      ) : null}
      <DocumentActions namespace="factory" actions={actions} onRun={run} disabled={form.formState.isDirty} />
    </>
  );

  const readOnlyHeader = record && !isNew ? (
    <DetailFields
      items={[
        { label: t("factory:fields.saleOrder"), value: `${record.saleOrderNumber} · ${record.customerName}` },
        { label: t("factory:fields.planned"), value: record.planStart && record.planFinish ? `${formatDate(record.planStart, language)} → ${formatDate(record.planFinish, language)}` : "—" },
        { label: t("factory:fields.remarks"), value: record.remarks, wide: true },
      ]}
    />
  ) : null;

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.workOrders")}
      newTitle={t("factory:workOrders.new")}
      titleOf={(wo) => wo.number}
      heading={isNew ? t("factory:workOrders.new") : t(editable ? "factory:workOrders.edit" : "factory:workOrders.view")}
      status={record?.status}
      singular={t("factory:workOrders.singular")}
      formId="wo-form"
      canEdit={editable}
      actions={headerActions}
    >
      <SheetFormBody>
        <form id="wo-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {editable ? (
            <FormSection title={t("factory:cards.order")} icon={ClipboardListIcon} aside={numberAside}>
              {/* the sales order line and its quantity are on one row; the quantity is what is left of the line and cannot be typed */}
              <div className="grid items-start gap-x-6 gap-y-5 @lg:col-span-2 @lg:grid-cols-[minmax(0,1fr)_11rem]">
                {isNew ? (
                  <FormField id="wo-line" label={t("factory:fields.saleOrderLine")} required error={message(errors.line)}>
                    <Controller
                      control={form.control}
                      name="line"
                      render={({ field }) => (
                        <EntitySelect
                          id="wo-line"
                          options={lineOptions}
                          value={field.value}
                          onChange={(value) => {
                            field.onChange(value);
                            const option = lineOptions.find((item) => item.id === value);
                            form.setValue("qty", option ? option.remaining : null, { shouldDirty: true });
                          }}
                          placeholder={t("factory:fields.chooseLine")}
                          {...fieldProps("line")}
                        />
                      )}
                    />
                  </FormField>
                ) : (
                  <DetailFields items={[{ label: t("factory:fields.saleOrder"), value: `${record.saleOrderNumber} · ${record.customerName}` }]} />
                )}
                <FormField id="wo-qty" label={`${t("factory:fields.qty")}${picked?.uom ? ` (${picked.uom})` : record?.uom ? ` (${record.uom})` : ""}`} error={message(errors.qty)}>
                  <Input id="wo-qty" type="number" readOnly tabIndex={-1} className="bg-muted text-right" {...fieldProps("qty")} {...form.register("qty", { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })} />
                </FormField>
              </div>
              {lineGone ? (
                <p role="alert" className="m-0 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 font-semibold text-warning @lg:col-span-2">
                  {t("factory:fields.lineGone")}
                </p>
              ) : null}
              <FormField id="wo-planStart" label={t("factory:fields.planStart")} error={message(errors.planStart)}>
                <DateField id="wo-planStart" control={form.control} name="planStart" {...fieldProps("planStart")} />
              </FormField>
              <FormField id="wo-planFinish" label={t("factory:fields.planFinish")} error={message(errors.planFinish)}>
                <DateField id="wo-planFinish" control={form.control} name="planFinish" min={form.watch("planStart") || undefined} {...fieldProps("planFinish")} />
              </FormField>
              <FormField id="wo-remarks" label={t("factory:fields.remarks")} error={message(errors.remarks)} className="@lg:col-span-2">
                <Textarea id="wo-remarks" {...fieldProps("remarks")} {...form.register("remarks")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t("factory:cards.order")} icon={ClipboardListIcon} aside={numberAside}>
              {readOnlyHeader}
            </SheetSection>
          ) : null}
        </form>

        {/* the product has a box of its own: its serial numbers are made here, by a button */}
        {!isNew && record ? <SerialCard workOrder={record} user={user} /> : null}

        {!isNew && record ? (
          <SheetSection title={t("factory:cards.progress")} icon={CogIcon}>
            <StepTimeline record={record} user={user} stepDialogs={stepDialogs} />
          </SheetSection>
        ) : null}

        {!isNew && record ? <IssuedMaterialsCard workOrder={record} /> : null}

        {/* outside the form: checking the materials never submits it */}
        {lines.length > 0 ? <AvailabilityCard lines={lines} check={(checked) => checkFactoryAvailability(checked, record?.id)} /> : null}

        {!isNew && record ? (
          <>
            <HistoryCard history={record.history} />
          </>
        ) : null}
      </SheetFormBody>
      {stepDialogs.element}
    </DocumentSheet>
  );
}
