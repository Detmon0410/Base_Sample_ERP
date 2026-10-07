import { LandmarkIcon, WalletIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { toast } from "sonner";

import { DateField } from "@/components/common/DateField";
import { DetailFields } from "@/components/common/DetailLayout";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { MoneyInput } from "@/components/common/MoneyInput";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { SheetSection } from "@/components/common/SheetSection";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { HistoryCard, LinksCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canEditMoney, canWork, DIRECTIONS, moneyActions } from "@/config/accounting";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { customerInvoiceService, customerReceiptService, supplierBillService, supplierPaymentService } from "@/services/accounting.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatCurrency, formatDate } from "@/utils/format";

import { emptyMoney, moneySchema, toFormValues } from "./moneySchema";

const SERVICES = { ar: customerReceiptService, ap: supplierPaymentService };
const DOC_SERVICES = { ar: customerInvoiceService, ap: supplierBillService };

/** C2 (direction "ar": customer receipt) and C4 ("ap": supplier payment): money against one invoice / bill. */
export function MoneySheet({ direction }) {
  const { t, i18n } = useTranslation(["accounting", "nav", "sale"]);
  const language = i18n.language;
  const d = DIRECTIONS[direction];
  const ns = direction === "ar" ? "receipts" : "payments";
  const service = SERVICES[direction];
  const { user } = useAuth();
  const { state: prefill } = useLocation();
  const page = useRecordForm({
    service,
    schema: moneySchema,
    emptyValues: emptyMoney(prefill),
    toValues: toFormValues,
    listPath: d.moneyPath,
    idPrefix: ns,
    afterCreatePath: (m) => `${d.moneyPath}/${m.id}`,
  });
  const { isNew, form, errors, message, fieldProps } = page;
  const record = page.record?.id != null ? page.record : null;
  const editable = isNew ? canWork(user) : Boolean(record && canEditMoney(record, user));
  const actions = !isNew && record ? moneyActions(record, user, direction) : [];
  const { control } = form;
  const docId = useWatch({ control, name: "docId" });
  const methodId = useWatch({ control, name: "methodId" });

  // the open invoices (bills): a new receipt picks one; the amount starts at its balance
  const [open, setOpen] = useState([]);
  useEffect(() => {
    if (!isNew) return undefined;
    let cancelled = false;
    DOC_SERVICES[direction]
      .list({ open: 1, pageSize: 100, sort: "number" })
      .then(({ items }) => !cancelled && setOpen(items))
      .catch(() => !cancelled && setOpen([]));
    return () => {
      cancelled = true;
    };
  }, [isNew, direction]);
  const docOptions = useMemo(() => open.map((doc) => ({ id: doc.id, code: doc.number, name: `${doc.partyName} · ${formatCurrency(doc.balance, language)}` })), [open, language]);
  const doc = open.find((row) => row.id === docId);
  useEffect(() => {
    if (isNew && doc && form.getValues("amount") == null) form.setValue("amount", doc.balance, { shouldDirty: true });
  }, [isNew, doc, form]);

  const { options: methods } = useOptions(simpleMasterServices.paymentMethods, { enabled: editable });
  const { options: banks } = useOptions(simpleMasterServices.bankAccounts, { enabled: editable });
  const method = methods.find((row) => row.id === methodId);
  const needsBank = method ? method.type !== "cash" : true;
  const bankOptions = useMemo(() => banks.map((bank) => ({ id: bank.id, code: bank.code, name: `${bank.name} · ${bank.bankName}` })), [banks]);
  useEffect(() => {
    if (editable && method?.type === "cash" && form.getValues("bankAccountId") != null) form.setValue("bankAccountId", null, { shouldDirty: true });
  }, [editable, method, form]);

  const run = async (action, note) => {
    try {
      const saved = await service.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`accounting:actions.${action.key}Money.done`));
    } catch (error) {
      toast.error(error?.code === "ACCOUNT_ROLE_MISSING" ? error.message : error?.code === "VALIDATION_ERROR" ? t("accounting:errors.CONFIRM_INVALID") : t(`accounting:errors.${error?.code}`, { defaultValue: t("accounting:errors.UNKNOWN") }));
      throw error;
    }
  };
  const money = (value) => formatCurrency(value, language);

  const numberAside = !isNew && record ? (
    <span className="flex shrink-0 items-center gap-3">
      <span>{record.number}</span>
      <DocumentStatusBadge status={record.status} />
    </span>
  ) : null;

  return (
    <DocumentSheet
      page={page}
      entityTitle={t(`nav:items.${ns}`)}
      newTitle={t(`accounting:${ns}.new`)}
      titleOf={(m) => m.number}
      heading={isNew ? t(`accounting:${ns}.new`) : t(editable ? `accounting:${ns}.edit` : `accounting:${ns}.view`)}
      status={record?.status}
      singular={t(`accounting:${ns}.singular`)}
      formId={`${ns}-form`}
      canEdit={editable}
      actions={<DocumentActions namespace="accounting" actions={actions.map((action) => ({ ...action, key: `${action.key}Money` }))} onRun={(action, note) => run({ ...action, key: action.key.replace("Money", "") }, note)} disabled={form.formState.isDirty} />}
    >
      <SheetFormBody>
        <form id={`${ns}-form`} noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {editable ? (
            <FormSection title={t(`accounting:cards.${ns}`)} icon={WalletIcon} aside={numberAside}>
              {isNew ? (
                <FormField id={`${ns}-docId`} label={t(`accounting:fields.${direction === "ar" ? "invoice" : "bill"}`)} required error={message(errors.docId)} className="@lg:col-span-2" hint={docOptions.length === 0 ? t(`accounting:${ns}.noOpen`) : undefined}>
                  <Controller control={control} name="docId" render={({ field }) => <EntitySelect id={`${ns}-docId`} options={docOptions} value={field.value} onChange={field.onChange} placeholder={t(`accounting:${ns}.chooseDoc`)} {...fieldProps("docId")} />} />
                </FormField>
              ) : (
                <div className="@lg:col-span-2">
                  <DetailFields
                    items={[
                      { label: t(`accounting:fields.${direction === "ar" ? "invoice" : "bill"}`), value: <Link to={`${d.docPath}/${record.docId}`} className="font-semibold text-primary underline-offset-2 hover:underline">{record.docNumber}</Link> },
                      { label: t(`accounting:fields.${direction === "ar" ? "customer" : "supplier"}`), value: `${record.partyCode} · ${record.partyName}` },
                      { label: t("accounting:fields.docTotal"), value: money(record.docTotal) },
                      { label: t("accounting:fields.docBalance"), value: money(record.docBalance) },
                    ]}
                  />
                </div>
              )}
              {isNew && doc ? (
                <div className="@lg:col-span-2">
                  <DetailFields items={[{ label: t(`accounting:fields.${direction === "ar" ? "customer" : "supplier"}`), value: doc.partyName }, { label: t("accounting:fields.docBalance"), value: money(doc.balance) }]} />
                </div>
              ) : null}
              <FormField id={`${ns}-date`} label={t("accounting:fields.date")} required error={message(errors.date)}>
                <DateField id={`${ns}-date`} control={control} name="date" clearable={false} {...fieldProps("date")} />
              </FormField>
              <FormField id={`${ns}-amount`} label={t("accounting:fields.amount")} required error={message(errors.amount)} hint={t("accounting:fields.amountHint")}>
                <MoneyInput id={`${ns}-amount`} {...fieldProps("amount")} {...form.register("amount", { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })} />
              </FormField>
              <FormField id={`${ns}-methodId`} label={t("accounting:fields.method")} required error={message(errors.methodId)}>
                <Controller control={control} name="methodId" render={({ field }) => <EntitySelect id={`${ns}-methodId`} options={methods} value={field.value} onChange={field.onChange} placeholder={t("accounting:fields.chooseMethod")} {...fieldProps("methodId")} />} />
              </FormField>
              <FormField id={`${ns}-bankAccountId`} label={t("accounting:fields.bankAccount")} required={needsBank} error={message(errors.bankAccountId)} hint={method?.type === "cash" ? t("accounting:fields.noBankForCash") : undefined}>
                <Controller control={control} name="bankAccountId" render={({ field }) => <EntitySelect id={`${ns}-bankAccountId`} options={bankOptions} value={field.value} disabled={method?.type === "cash"} onChange={field.onChange} placeholder={t("accounting:fields.chooseBank")} {...fieldProps("bankAccountId")} />} />
              </FormField>
              <FormField id={`${ns}-reference`} label={t("accounting:fields.reference")} error={message(errors.reference)} hint={t("accounting:fields.referenceHint")}>
                <Input id={`${ns}-reference`} {...fieldProps("reference")} {...form.register("reference")} />
              </FormField>
              <FormField id={`${ns}-remarks`} label={t("accounting:fields.remarks")} error={message(errors.remarks)} className="@lg:col-span-2">
                <Textarea id={`${ns}-remarks`} {...fieldProps("remarks")} {...form.register("remarks")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t(`accounting:cards.${ns}`)} icon={WalletIcon} aside={numberAside}>
              <DetailFields
                items={[
                  { label: t(`accounting:fields.${direction === "ar" ? "invoice" : "bill"}`), value: <Link to={`${d.docPath}/${record.docId}`} className="font-semibold text-primary underline-offset-2 hover:underline">{record.docNumber}</Link> },
                  { label: t(`accounting:fields.${direction === "ar" ? "customer" : "supplier"}`), value: `${record.partyCode} · ${record.partyName}` },
                  { label: t("accounting:fields.date"), value: formatDate(record.date, language) },
                  { label: t("accounting:fields.amount"), value: <span className="text-lg font-bold text-slate-900">{money(record.amount)}</span> },
                  { label: t("accounting:fields.method"), value: record.methodName },
                  { label: t("accounting:fields.bankAccount"), value: record.bankAccountName ?? "—" },
                  { label: t("accounting:fields.reference"), value: record.reference || "—" },
                  { label: t("accounting:fields.createdBy"), value: record.createdBy },
                  { label: t("accounting:fields.remarks"), value: record.remarks, wide: true },
                ]}
              />
            </SheetSection>
          ) : null}
        </form>

        {!isNew && record ? (
          <>
            <SheetSection title={t("accounting:cards.bankLine")} icon={LandmarkIcon}>
              <p>{record.status === "confirmed" ? t("accounting:money.booked", { number: record.links.find((link) => link.type === "journalEntry")?.number ?? "—" }) : t("accounting:money.notBooked")}</p>
            </SheetSection>
            <HistoryCard history={record.history} />
            <LinksCard links={record.links} />
          </>
        ) : null}
      </SheetFormBody>
    </DocumentSheet>
  );
}
