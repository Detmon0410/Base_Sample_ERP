import { BookOpenIcon, CircleCheckIcon, ListIcon, PlusIcon, Trash2Icon, TriangleAlertIcon } from "lucide-react";
import { useMemo } from "react";
import { Controller, useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canEditEntry, canWork, entryActions } from "@/config/accounting";
import { useAuth } from "@/hooks/useAuth";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { journalService } from "@/services/accounting.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatCurrency, formatDate } from "@/utils/format";

import { EMPTY_ENTRY_LINE, emptyEntry, journalSchema, toFormValues } from "./journalSchema";

/** C5 — /accounting/journal/new and /:id. An entry of the system is read only; a manual draft is edited, balanced and posted by a Manager. */
export function JournalSheet() {
  const { t, i18n } = useTranslation(["accounting", "nav", "sale"]);
  const language = i18n.language;
  const { user } = useAuth();
  const page = useRecordForm({
    service: journalService,
    schema: journalSchema,
    emptyValues: emptyEntry(),
    toValues: toFormValues,
    listPath: "/accounting/journal",
    idPrefix: "je",
    afterCreatePath: (entry) => `/accounting/journal/${entry.id}`,
  });
  const { isNew, form, errors, message, fieldProps } = page;
  const record = page.record?.id != null ? page.record : null;
  const editable = isNew ? canWork(user) : Boolean(record && canEditEntry(record, user));
  const actions = !isNew && record ? entryActions(record, user) : [];
  const { control } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watched = useWatch({ control, name: "lines" }) ?? [];
  const { options: accounts } = useOptions(simpleMasterServices.accounts, { enabled: editable });
  const accountOptions = useMemo(() => accounts.map((account) => ({ id: account.id, code: account.code, name: account.name })), [accounts]);
  const money = (value) => formatCurrency(value, language);

  // the balance check is always visible: the totals, the difference, and whether the entry can be posted
  const debit = watched.reduce((sum, line) => sum + (Number(line?.debit) || 0), 0);
  const credit = watched.reduce((sum, line) => sum + (Number(line?.credit) || 0), 0);
  const difference = debit - credit;
  const balanced = difference === 0 && debit > 0;

  const run = async (action, note) => {
    try {
      const saved = await journalService.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`accounting:actions.${action.key}.done`));
    } catch (error) {
      toast.error(t(`accounting:errors.${error?.code}`, { defaultValue: t("accounting:errors.UNKNOWN") }));
      throw error;
    }
  };

  const numberAside = !isNew && record ? (
    <span className="flex shrink-0 items-center gap-3">
      <span>{record.number}</span>
      <DocumentStatusBadge status={record.status} />
    </span>
  ) : null;

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.journal")}
      newTitle={t("accounting:journal.new")}
      titleOf={(entry) => entry.number}
      heading={isNew ? t("accounting:journal.new") : t(editable ? "accounting:journal.edit" : "accounting:journal.view")}
      status={record?.status}
      singular={t("accounting:journal.singular")}
      formId="je-form"
      canEdit={editable}
      actions={<DocumentActions namespace="accounting" actions={actions} onRun={run} disabled={form.formState.isDirty || (record?.status === "draft" && !balanced)} />}
    >
      <SheetFormBody>
        <form id="je-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {editable ? (
            <FormSection title={t("accounting:cards.entry")} icon={BookOpenIcon} aside={numberAside}>
              <FormField id="je-date" label={t("accounting:fields.date")} required error={message(errors.date)}>
                <DateField id="je-date" control={control} name="date" clearable={false} {...fieldProps("date")} />
              </FormField>
              <FormField id="je-reference" label={t("accounting:fields.reference")} error={message(errors.reference)}>
                <Input id="je-reference" {...fieldProps("reference")} {...form.register("reference")} />
              </FormField>
              <FormField id="je-memo" label={t("accounting:fields.memo")} required error={message(errors.memo)} className="@lg:col-span-2">
                <Input id="je-memo" {...fieldProps("memo")} {...form.register("memo")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t("accounting:cards.entry")} icon={BookOpenIcon} aside={numberAside}>
              <DetailFields
                items={[
                  { label: t("accounting:fields.date"), value: formatDate(record.date, language) },
                  { label: t("accounting:columns.source"), value: t(`accounting:source.${record.source}`) },
                  { label: t("accounting:fields.memo"), value: record.memo, wide: true },
                  { label: t("accounting:fields.reference"), value: record.reference || record.docNumber || "—" },
                  ...(record.reversalOfNumber ? [{ label: t("accounting:journal.reversalOf"), value: record.reversalOfNumber }] : []),
                  { label: t("accounting:fields.createdBy"), value: record.createdBy },
                ]}
              />
            </SheetSection>
          ) : null}

          <SheetSection title={t("accounting:journal.lines")} icon={ListIcon}>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[40rem] text-[15px]">
                <thead className="bg-[#EEEEEE] text-[#4C4C4C]">
                  <tr className="text-left text-sm font-semibold">
                    <th className="h-10 px-2">{t("accounting:journal.account")}</th>
                    <th className="h-10 w-36 px-2 text-right">{t("accounting:journal.debit")}</th>
                    <th className="h-10 w-36 px-2 text-right">{t("accounting:journal.credit")}</th>
                    <th className="h-10 px-2">{t("accounting:journal.lineMemo")}</th>
                    {editable ? <th className="h-10 w-12 px-2"><span className="sr-only">{t("accounting:journal.remove")}</span></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {editable
                    ? fields.map((field, index) => {
                        const lineErrors = errors.lines?.[index];
                        return (
                          <tr key={field.id} className="border-b border-slate-200 align-top last:border-b-0 odd:bg-card even:bg-slate-50">
                            <td className="px-1 py-1.5">
                              <Controller control={control} name={`lines.${index}.accountId`} render={({ field: accountField }) => <EntitySelect id={`je-line-${index}-account`} options={accountOptions} value={accountField.value} onChange={accountField.onChange} placeholder={t("accounting:journal.chooseAccount")} aria-invalid={lineErrors?.accountId ? true : undefined} />} />
                              {lineErrors?.accountId ? <p className="mt-1 text-sm text-destructive">{t(lineErrors.accountId.message)}</p> : null}
                            </td>
                            <td className="px-1 py-1.5">
                              <MoneyInput className="h-11" aria-label={`${t("accounting:journal.debit")} ${index + 1}`} aria-invalid={lineErrors?.debit ? true : undefined} {...form.register(`lines.${index}.debit`, { setValueAs: (value) => (value === "" || value == null ? 0 : Number(value)) })} />
                              {lineErrors?.debit ? <p className="mt-1 text-sm text-destructive">{t(lineErrors.debit.message)}</p> : null}
                            </td>
                            <td className="px-1 py-1.5">
                              <MoneyInput className="h-11" aria-label={`${t("accounting:journal.credit")} ${index + 1}`} {...form.register(`lines.${index}.credit`, { setValueAs: (value) => (value === "" || value == null ? 0 : Number(value)) })} />
                            </td>
                            <td className="px-1 py-1.5">
                              <Input className="h-11" aria-label={`${t("accounting:journal.lineMemo")} ${index + 1}`} {...form.register(`lines.${index}.memo`)} />
                            </td>
                            <td className="px-1 py-1.5 text-right">
                              <Button type="button" variant="ghost" size="icon" className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`${t("accounting:journal.remove")} ${index + 1}`} onClick={() => remove(index)} disabled={fields.length <= 2}>
                                <Trash2Icon />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    : (record?.lines ?? []).map((line, index) => (
                        <tr key={index} className="border-b border-slate-200 odd:bg-card even:bg-slate-50 last:border-b-0">
                          <td className="px-2 py-2 font-semibold text-slate-900">
                            {line.accountCode} <span className="font-normal text-muted-foreground">· {line.accountName}</span>
                          </td>
                          <td className="px-2 py-2 text-right whitespace-nowrap">{line.debit ? money(line.debit) : ""}</td>
                          <td className="px-2 py-2 text-right whitespace-nowrap">{line.credit ? money(line.credit) : ""}</td>
                          <td className="px-2 py-2">{line.memo || "—"}</td>
                        </tr>
                      ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300 font-bold">
                    <td className="px-2 py-2.5 text-right">{t("accounting:journal.totals")}</td>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">{money(editable ? debit : record?.debit ?? 0)}</td>
                    <td className="px-2 py-2.5 text-right whitespace-nowrap">{money(editable ? credit : record?.credit ?? 0)}</td>
                    <td colSpan={editable ? 2 : 1} />
                  </tr>
                </tfoot>
              </table>
            </div>
            {errors.lines?.message || errors.lines?.root?.message ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {t(errors.lines.message ?? errors.lines.root.message)}
              </p>
            ) : null}
            {editable ? (
              <>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <Button type="button" variant="outline" onClick={() => append({ ...EMPTY_ENTRY_LINE })}>
                    <PlusIcon aria-hidden="true" /> {t("accounting:journal.addLine")}
                  </Button>
                  <p role="status" className={`flex items-center gap-2 text-base font-semibold ${balanced ? "text-success" : "text-destructive"}`}>
                    {balanced ? <CircleCheckIcon className="size-5" aria-hidden="true" /> : <TriangleAlertIcon className="size-5" aria-hidden="true" />}
                    {balanced ? t("accounting:journal.balanced") : t("accounting:journal.difference", { amount: money(Math.abs(difference)) })}
                  </p>
                </div>
              </>
            ) : null}
          </SheetSection>
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
