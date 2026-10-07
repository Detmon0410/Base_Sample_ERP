import { FileTextIcon, ListIcon, TriangleAlertIcon, UserRoundIcon, WalletIcon } from "lucide-react";
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
import { CreditWarning, lineAmount, MoneyTotals, PaymentsCard } from "@/components/accounting/MoneyParts";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { HistoryCard, LinksCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/common/MoneyInput";
import { Textarea } from "@/components/ui/textarea";
import { canEditDoc, canPay, canWork, DIRECTIONS, documentActions } from "@/config/accounting";
import { WHOLE_UNITS } from "@/config/purchase";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { customerInvoiceService, supplierBillService } from "@/services/accounting.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatCurrency, formatDate, formatNumber } from "@/utils/format";

import { emptyMoneyDocument, lineFromSource, moneyDocumentSchema, toFormValues, toPayload } from "./moneyDocumentSchema";

const SERVICES = { ar: customerInvoiceService, ap: supplierBillService };

/** C1 + C3 — an invoice (direction "ar") or a supplier bill ("ap"): a draft is editable, every other status is read only. */
export function MoneyDocumentSheet({ direction }) {
  const { t, i18n } = useTranslation(["accounting", "nav", "sale"]);
  const language = i18n.language;
  const d = DIRECTIONS[direction];
  const service = SERVICES[direction];
  const ns = d.ns; // "invoices" | "bills"
  const { user } = useAuth();
  const { state: prefill } = useLocation();
  const page = useRecordForm({
    service,
    schema: moneyDocumentSchema,
    emptyValues: emptyMoneyDocument(prefill),
    toValues: toFormValues,
    toPayload,
    listPath: d.docPath,
    idPrefix: ns,
    afterCreatePath: (doc) => `${d.docPath}/${doc.id}`,
  });
  const { isNew, form, errors, message, fieldProps } = page;
  const record = page.record?.id != null ? page.record : null;
  const editable = isNew ? canWork(user) : Boolean(record && canEditDoc(record, user));
  const actions = !isNew && record ? documentActions(record, user, direction) : [];
  const { control } = form;
  const { fields, replace } = useFieldArray({ control, name: "lines" });
  const watched = useWatch({ control, name: "lines" }) ?? [];
  const sourceId = useWatch({ control, name: "sourceId" });
  const taxRateId = useWatch({ control, name: "taxRateId" });

  // the delivery notes (receipts) that can still be invoiced (billed); choosing one fills the lines
  const [sources, setSources] = useState([]);
  useEffect(() => {
    if (!isNew) return undefined;
    let cancelled = false;
    service
      .sources()
      .then((items) => !cancelled && setSources(items))
      .catch(() => !cancelled && setSources([]));
    return () => {
      cancelled = true;
    };
  }, [isNew, service]);
  const sourceOptions = useMemo(() => sources.map((row) => ({ id: row.id, code: row.number, name: `${row.partyName} · ${row.ref}` })), [sources]);
  const source = sources.find((row) => row.id === sourceId);
  useEffect(() => {
    if (isNew && source) replace(source.lines.map(lineFromSource));
  }, [isNew, source, replace]);

  const { options: taxRates } = useOptions(simpleMasterServices.taxRates, { enabled: editable });
  const vatOptions = useMemo(() => taxRates.filter((rate) => rate.kind === "vat").map((rate) => ({ id: rate.id, code: rate.code, name: `${rate.name} (${rate.rate} %)`, rate: rate.rate, isDefault: rate.isDefault === "yes" })), [taxRates]);
  useEffect(() => {
    if (editable && isNew && taxRateId == null && vatOptions.length) form.setValue("taxRateId", (vatOptions.find((rate) => rate.isDefault) ?? vatOptions[0]).id, { shouldDirty: false });
  }, [editable, isNew, taxRateId, vatOptions, form]);
  const ratePercent = editable ? (vatOptions.find((rate) => rate.id === taxRateId)?.rate ?? 0) : (record?.taxRatePercent ?? 0);

  const info = useMemo(() => new Map((isNew ? (source?.lines ?? []) : (record?.lines ?? [])).map((line) => [line.itemId, line])), [isNew, source, record]);
  const money = (value) => formatCurrency(value, language);
  const number = (value) => formatNumber(value, language);

  const run = async (action, note) => {
    try {
      const saved = await service.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`accounting:actions.${action.key}.done`));
    } catch (error) {
      toast.error(error?.code === "ACCOUNT_ROLE_MISSING" ? error.message : t(`accounting:errors.${error?.code}`, { defaultValue: t("accounting:errors.UNKNOWN") }));
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
      {record && canPay(record, user) ? (
        <Button asChild size="sm" className="h-9" disabled={form.formState.isDirty}>
          <Link to={`${d.moneyPath}/new`} state={{ docId: record.id }}>
            <WalletIcon aria-hidden="true" /> {t(`accounting:${ns}.pay`)}
          </Link>
        </Button>
      ) : null}
      <DocumentActions namespace="accounting" actions={actions} onRun={run} disabled={form.formState.isDirty} />
    </>
  );

  const references =
    direction === "ar"
      ? [
          { label: t("accounting:fields.customer"), value: record ? `${record.partyCode} · ${record.partyName}` : "—" },
          { label: t("accounting:fields.saleOrder"), value: record?.saleOrderNumber ?? "—" },
          { label: t("accounting:fields.delivery"), value: record?.deliveryNumber ?? "—" },
        ]
      : [
          { label: t("accounting:fields.supplier"), value: record ? `${record.partyCode} · ${record.partyName}` : "—" },
          { label: t("accounting:fields.po"), value: record?.poNumber ?? "—" },
          { label: t("accounting:fields.receipt"), value: record?.receiptNumber ?? "—" },
          { label: t("accounting:fields.supplierInvoiceNo"), value: record?.supplierInvoiceNo || "—" },
        ];

  return (
    <DocumentSheet
      page={page}
      entityTitle={t(`nav:items.${direction === "ar" ? "invoices" : "bills"}`)}
      newTitle={t(`accounting:${ns}.new`)}
      titleOf={(doc) => doc.number}
      heading={isNew ? t(`accounting:${ns}.new`) : t(editable ? `accounting:${ns}.edit` : `accounting:${ns}.view`)}
      status={record?.status}
      singular={t(`accounting:${ns}.singular`)}
      printKind={direction === "ar" ? "invoice" : "bill"}
      formId={`${ns}-form`}
      canEdit={editable}
      actions={headerActions}
    >
      <SheetFormBody>
        <form id={`${ns}-form`} noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {record?.overdueDays > 0 ? (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 font-semibold text-destructive">
              <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" /> {t("accounting:overdueDays", { count: record.overdueDays, balance: money(record.balance) })}
            </p>
          ) : null}
          {direction === "ar" ? <CreditWarning account={record?.customerAccount} /> : null}

          {editable ? (
            <FormSection title={t("accounting:cards.document")} icon={FileTextIcon} aside={numberAside}>
              {isNew ? (
                <FormField id={`${ns}-sourceId`} label={t(`accounting:fields.${direction === "ar" ? "delivery" : "receipt"}`)} required error={message(errors.sourceId)} className="@lg:col-span-2" hint={sourceOptions.length === 0 ? t(`accounting:${ns}.noSource`) : t(`accounting:${ns}.sourceHint`)}>
                  <Controller control={control} name="sourceId" render={({ field }) => <EntitySelect id={`${ns}-sourceId`} options={sourceOptions} value={field.value} onChange={field.onChange} placeholder={t(`accounting:${ns}.chooseSource`)} {...fieldProps("sourceId")} />} />
                </FormField>
              ) : (
                <div className="@lg:col-span-2">
                  <DetailFields items={references} />
                </div>
              )}
              {isNew && source ? (
                <div className="@lg:col-span-2">
                  <DetailFields items={[{ label: t(`accounting:fields.${direction === "ar" ? "customer" : "supplier"}`), value: source.partyName }, { label: t("accounting:fields.reference"), value: source.ref }]} />
                </div>
              ) : null}
              <FormField id={`${ns}-date`} label={t("accounting:fields.date")} required error={message(errors.date)}>
                <DateField id={`${ns}-date`} control={control} name="date" clearable={false} {...fieldProps("date")} />
              </FormField>
              <FormField id={`${ns}-dueDate`} label={t("accounting:fields.dueDate")} error={message(errors.dueDate)} hint={t("accounting:fields.dueHint")}>
                <DateField id={`${ns}-dueDate`} control={control} name="dueDate" min={form.watch("date") || undefined} {...fieldProps("dueDate")} />
              </FormField>
              <FormField id={`${ns}-taxRateId`} label={t("accounting:fields.taxRate")} required error={message(errors.taxRateId)}>
                <Controller control={control} name="taxRateId" render={({ field }) => <EntitySelect id={`${ns}-taxRateId`} options={vatOptions} value={field.value} onChange={field.onChange} placeholder={t("accounting:fields.chooseTaxRate")} {...fieldProps("taxRateId")} />} />
              </FormField>
              {direction === "ap" ? (
                <FormField id="bills-supplierInvoiceNo" label={t("accounting:fields.supplierInvoiceNo")} error={message(errors.supplierInvoiceNo)}>
                  <Input id="bills-supplierInvoiceNo" {...fieldProps("supplierInvoiceNo")} {...form.register("supplierInvoiceNo")} />
                </FormField>
              ) : null}
              <FormField id={`${ns}-remarks`} label={t("accounting:fields.remarks")} error={message(errors.remarks)} className="@lg:col-span-2">
                <Textarea id={`${ns}-remarks`} {...fieldProps("remarks")} {...form.register("remarks")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t("accounting:cards.document")} icon={FileTextIcon} aside={numberAside}>
              <DetailFields
                items={[
                  ...references,
                  { label: t("accounting:fields.date"), value: formatDate(record.date, language) },
                  { label: t("accounting:fields.dueDate"), value: formatDate(record.dueDate, language) },
                  { label: t("accounting:fields.taxRate"), value: `${record.taxRatePercent} %` },
                  { label: t("accounting:fields.createdBy"), value: record.createdBy },
                  { label: t("accounting:fields.remarks"), value: record.remarks, wide: true },
                ]}
              />
            </SheetSection>
          ) : null}

          <SheetSection title={t("accounting:lines.title")} icon={ListIcon}>
            {editable ? (
              fields.length === 0 ? (
                <p className="rounded-xl border border-dashed p-5 text-center text-muted-foreground">{t(`accounting:${ns}.chooseSourceFirst`)}</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[40rem] text-base">
                    <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                      <tr className="text-left text-sm font-semibold">
                        <th className="h-10 w-12 px-2 text-center">{t("accounting:lines.no")}</th>
                        <th className="h-10 px-2">{t("accounting:lines.item")}</th>
                        <th className="h-10 w-40 px-2 text-right">{t("accounting:lines.qty")}</th>
                        <th className="h-10 w-36 px-2 text-right">{t("accounting:lines.unitPrice")}</th>
                        <th className="h-10 w-32 px-2 text-right">{t("accounting:lines.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const line = watched[index] ?? field;
                        const row = info.get(line.itemId);
                        const lineErrors = errors.lines?.[index];
                        const label = (name) => `${t(`accounting:lines.${name}`)}, ${row?.code ?? ""}`;
                        return (
                          <tr key={field.id} className="border-b border-slate-200 align-top last:border-b-0 odd:bg-card even:bg-slate-50">
                            <td className="px-2 py-3 text-center text-muted-foreground">{index + 1}</td>
                            <td className="px-2 py-3 font-semibold text-slate-900">
                              {row?.code} <span className="font-normal text-muted-foreground">· {row?.name}</span>
                            </td>
                            <td className="px-1 py-1.5">
                              <div className="flex items-center gap-1">
                                <Input type="number" min={0} step={WHOLE_UNITS.includes(row?.uom) ? 1 : 0.001} inputMode="decimal" className="h-10 text-right" aria-label={label("qty")} aria-invalid={lineErrors?.qty ? true : undefined} {...form.register(`lines.${index}.qty`, { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })} />
                                <span className="shrink-0 text-sm text-muted-foreground">{row?.uom}</span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{t("accounting:lines.upTo", { max: number(line.maxQty) })}</p>
                              {lineErrors?.qty ? <p className="mt-1 text-sm text-destructive">{t(lineErrors.qty.message)}</p> : null}
                            </td>
                            <td className="px-1 py-1.5">
                              <MoneyInput className="h-10" aria-label={label("unitPrice")} aria-invalid={lineErrors?.unitPrice ? true : undefined} {...form.register(`lines.${index}.unitPrice`, { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })} />
                              {lineErrors?.unitPrice ? <p className="mt-1 text-sm text-destructive">{t(lineErrors.unitPrice.message)}</p> : null}
                            </td>
                            <td className="px-2 py-3 text-right font-semibold whitespace-nowrap">{money(lineAmount(line))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[36rem] text-[15px] text-[#666]">
                  <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                    <tr className="text-left text-sm font-semibold">
                      <th className="h-10 w-12 px-2 text-center">{t("accounting:lines.no")}</th>
                      <th className="h-10 px-2">{t("accounting:lines.item")}</th>
                      <th className="h-10 px-2 text-right">{t("accounting:lines.qty")}</th>
                      <th className="h-10 px-2 text-right">{t("accounting:lines.unitPrice")}</th>
                      <th className="h-10 px-2 text-right">{t("accounting:lines.amount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(record?.lines ?? []).map((line, index) => (
                      <tr key={line.itemId} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                        <td className="px-2 py-2 text-center text-muted-foreground">{index + 1}</td>
                        <td className="px-2 py-2 font-semibold text-slate-900">
                          {line.code} <span className="font-normal text-muted-foreground">· {line.name}</span>
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{`${number(line.qty)} ${line.uom}`}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{money(line.unitPrice)}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{money(line.amount)}</td>
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
            <MoneyTotals lines={editable ? watched : (record?.lines ?? [])} ratePercent={ratePercent} />
          </SheetSection>
        </form>

        {!isNew && record ? (
          <>
            {record.storedStatus !== "draft" && record.storedStatus !== "cancelled" ? <PaymentsCard doc={record} moneyPath={d.moneyPath} title={t(`accounting:cards.${direction === "ar" ? "receiptsOf" : "paymentsOf"}`)} emptyText={t(`accounting:${ns}.noPayments`)} /> : null}
            {direction === "ar" && record.customerAccount ? (
              <SheetSection title={t("accounting:cards.customerAccount")} icon={UserRoundIcon}>
                <DetailFields
                  items={[
                    { label: t("accounting:fields.openBalance"), value: money(record.customerAccount.openBalance) },
                    { label: t("accounting:fields.creditLimit"), value: record.customerAccount.creditLimit != null ? money(record.customerAccount.creditLimit) : t("accounting:fields.noLimit") },
                  ]}
                />
              </SheetSection>
            ) : null}
            <HistoryCard history={record.history} />
            <LinksCard links={record.links} />
          </>
        ) : null}
      </SheetFormBody>
    </DocumentSheet>
  );
}
