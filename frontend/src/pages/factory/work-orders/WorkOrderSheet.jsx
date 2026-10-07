import { ClipboardListIcon, CogIcon, ListChecksIcon, WarehouseIcon } from "lucide-react";
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
import { ProgressBar } from "@/components/common/ProgressBar";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { SheetSection } from "@/components/common/SheetSection";
import { AvailabilityCard } from "@/components/documents/AvailabilityCard";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { HistoryCard, LinksCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { StepProgress } from "@/components/factory/StepProgress";
import { useStepDialogs } from "@/components/factory/useStepDialogs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canWork, stepAbilities, workOrderActions } from "@/config/factory";
import { useAuth } from "@/hooks/useAuth";
import { useRecordForm } from "@/hooks/useRecordForm";
import { checkFactoryAvailability, listWaitingOrders, workOrderService } from "@/services/factory.service";
import { formatDate, formatDateTime, formatNumber } from "@/utils/format";

import { emptyWorkOrder, toFormValues, toPayload, workOrderSchema } from "./workOrderSchema";

const time = (value, language) => (value ? formatDateTime(value, language) : "—");

/** F2 + F3 — /factory/work-orders/new and /:id (a draft is editable, every other status is read-only). */
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
  useEffect(() => {
    if (!isNew) return undefined;
    let cancelled = false;
    listWaitingOrders()
      .then((orders) => !cancelled && setWaiting(orders))
      .catch(() => !cancelled && setWaiting([]));
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

  const stepDialogs = useStepDialogs({ onChanged: (saved) => page.applyRecord(saved) });
  const errorText = (error) => t(`factory:errors.${error?.code}`, { defaultValue: t("factory:errors.UNKNOWN") });

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

  const lines = isNew ? (picked && qtyValue > 0 ? [{ productId: picked.productId, qty: qtyValue }] : []) : record?.status ? [{ productId: record.productId, qty: record.qty }] : [];
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
        { label: t("factory:fields.product"), value: `${record.productCode} · ${record.productName}` },
        { label: t("factory:fields.qty"), value: `${formatNumber(record.qty, language)} ${record.uom}` },
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
              {isNew ? (
                <FormField id="wo-line" label={t("factory:fields.saleOrderLine")} required error={message(errors.line)} className="@lg:col-span-2">
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
                          if (option) form.setValue("qty", option.remaining, { shouldDirty: true });
                        }}
                        placeholder={t("factory:fields.chooseLine")}
                        {...fieldProps("line")}
                      />
                    )}
                  />
                </FormField>
              ) : (
                <div className="@lg:col-span-2">
                  <DetailFields
                    items={[
                      { label: t("factory:fields.saleOrder"), value: `${record.saleOrderNumber} · ${record.customerName}` },
                      { label: t("factory:fields.product"), value: `${record.productCode} · ${record.productName}` },
                    ]}
                  />
                </div>
              )}
              <FormField
                id="wo-qty"
                label={`${t("factory:fields.qty")}${picked?.uom ? ` (${picked.uom})` : record?.uom ? ` (${record.uom})` : ""}`}
                required
                error={message(errors.qty)}
                hint={picked ? t("factory:fields.qtyHint", { max: formatNumber(picked.remaining, language), uom: picked.uom }) : undefined}
              >
                <Input id="wo-qty" type="number" min={1} step={1} inputMode="numeric" className="text-right" {...fieldProps("qty", Boolean(picked))} {...form.register("qty", { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })} />
              </FormField>
              <div />
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

        {!isNew && record ? (
          <>
            <SheetSection title={t("factory:cards.progress")} icon={CogIcon}>
              <StepProgress steps={record.steps} size="lg" />
              <div className="mt-5 flex flex-col gap-2">
                <ProgressBar
                  value={record.progress.stepsDone}
                  max={record.progress.stepsTotal}
                  label={t("factory:card.stepsDone", { done: record.progress.stepsDone, total: record.progress.stepsTotal })}
                  tone={record.status === "finished" ? "success" : record.progress.late ? "warning" : "primary"}
                />
                <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                  <span className="font-semibold text-slate-700">{t("factory:card.stepsDone", { done: record.progress.stepsDone, total: record.progress.stepsTotal })}</span>
                  <span className="text-muted-foreground">
                    {t("factory:card.produced", { done: formatNumber(record.progress.producedQty, language), qty: formatNumber(record.qty, language), uom: record.uom })}
                    {record.progress.transferredQty > 0 ? ` · ${t("factory:card.transferred", { qty: formatNumber(record.progress.transferredQty, language), uom: record.uom })}` : ""}
                  </span>
                </p>
                {record.progress.late ? (
                  <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
                    {t("factory:card.lateDays", { count: record.progress.lateDays })}
                  </p>
                ) : null}
              </div>
            </SheetSection>

            <SheetSection title={t("factory:cards.tracking")} icon={ListChecksIcon}>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[46rem] text-base">
                  <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                    <tr className="text-left text-sm font-semibold">
                      <th className="h-10 w-12 px-2 text-center">{t("factory:steps.no")}</th>
                      <th className="h-10 px-2">{t("factory:steps.process")}</th>
                      <th className="h-10 px-2">{t("factory:steps.machineOperator")}</th>
                      <th className="h-10 px-2">{t("factory:steps.time")}</th>
                      <th className="h-10 px-2 text-right">{t("factory:steps.qty")}</th>
                      <th className="h-10 px-2">{t("factory:steps.statusHead")}</th>
                      <th className="h-10 w-36 px-2">
                        <span className="sr-only">{t("factory:steps.actions")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.steps.map((step) => {
                      const can = stepAbilities(record, step, user);
                      return (
                        <tr key={step.id} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                          <td className="px-2 py-2 text-center font-semibold text-muted-foreground">{step.stepNo}</td>
                          <td className="px-2 py-2 font-semibold whitespace-normal">{step.processName}</td>
                          <td className="px-2 py-2 text-sm whitespace-normal">
                            <p>{step.machineCode ? `${step.machineCode} · ${step.machineName}` : t("factory:steps.noMachine")}</p>
                            <p className="text-muted-foreground">{step.operatorName ?? "—"}</p>
                          </td>
                          <td className="px-2 py-2 text-sm whitespace-nowrap">
                            <p>{time(step.startAt, language)}</p>
                            <p className="text-muted-foreground">{time(step.endAt, language)}</p>
                          </td>
                          <td className="px-2 py-2 text-right text-sm whitespace-nowrap">
                            {step.status === "done" ? (
                              <>
                                <p className="font-semibold">{formatNumber(step.qtyDone, language)}</p>
                                <p className={step.qtyDefect > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}>{t("factory:steps.defectCount", { count: step.qtyDefect })}</p>
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={
                                step.status === "done" ? "font-semibold text-success" : step.status === "in_progress" ? "font-semibold text-primary" : "text-muted-foreground"
                              }
                            >
                              {t(`factory:steps.status.${step.status}`)}
                            </span>
                          </td>
                          <td className="px-1 py-1 text-right whitespace-nowrap">
                            {can.start ? (
                              <Button type="button" size="sm" variant="secondary" className="h-9" onClick={() => stepDialogs.open("start", record, step)}>
                                {t("factory:steps.start")}
                              </Button>
                            ) : null}
                            {can.done ? (
                              <Button type="button" size="sm" className="h-9" onClick={() => stepDialogs.open("done", record, step)}>
                                {t("factory:steps.done")}
                              </Button>
                            ) : null}
                            {can.reopen ? (
                              <Button type="button" size="sm" variant="ghost" className="h-9 text-slate-600" onClick={() => stepDialogs.open("reopen", record, step)}>
                                {t("factory:steps.reopen")}
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </SheetSection>
          </>
        ) : null}

        {/* outside the form: checking the materials never submits it */}
        {lines.length > 0 ? <AvailabilityCard lines={lines} check={checkFactoryAvailability} /> : null}

        {!isNew && record ? (
          <>
            <HistoryCard history={record.history} />
            <LinksCard links={record.links} />
          </>
        ) : null}
      </SheetFormBody>
      {stepDialogs.element}
    </DocumentSheet>
  );
}
