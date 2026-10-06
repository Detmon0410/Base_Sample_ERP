import { FileTextIcon, PaperclipIcon, TriangleAlertIcon } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { DetailFields } from "@/components/common/DetailLayout";
import { DateField } from "@/components/common/DateField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FileField } from "@/components/common/FileField";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { SheetSection } from "@/components/common/SheetSection";
import { HistoryCard, LinksCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canWork } from "@/config/sale";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerDocuments } from "@/hooks/useCustomerDocuments";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { customerService } from "@/services/customer.service";
import { customerPoService, quotationService } from "@/services/sale.service";
import { formatDate } from "@/utils/format";

import { customerPoSchema, emptyCustomerPo, toFormValues } from "./customerPoSchema";

const ACCEPTED = { status: "accepted" };
const quotationNumber = (doc) => doc.number;
const quotationLabel = (doc) => doc.date;

/** S4 — /sale/customer-pos/new and /:id. A record of a document that came from the customer (no status). */
export function CustomerPoSheet() {
  const { t, i18n } = useTranslation(["sale", "nav"]);
  const { user } = useAuth();
  const page = useRecordForm({
    service: customerPoService,
    schema: customerPoSchema,
    emptyValues: emptyCustomerPo(),
    toValues: toFormValues,
    listPath: "/sale/customer-pos",
    idPrefix: "po",
    afterCreatePath: (po) => `/sale/customer-pos/${po.id}`,
  });
  const { isNew, record, form, errors, message, fieldProps } = page;
  const { options: customers } = useOptions(customerService);
  const customerId = form.watch("customerId");
  const quotations = useCustomerDocuments(quotationService, customerId, ACCEPTED, { numberOf: quotationNumber, labelOf: quotationLabel });

  // Locked once an order uses the PO (spec Q5): read only, delete blocked.
  const locked = !isNew && Boolean(record?.inUse);
  const editable = (isNew || !locked) && canWork(user);

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.customerPos")}
      newTitle={t("sale:customerPos.new")}
      titleOf={(po) => po.poNumber}
      singular={t("sale:customerPos.singular")}
      formId="po-form"
      canEdit={editable}
    >
      <SheetFormBody>
        {locked ? (
          <p role="status" className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-warning">
            <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" /> {t("sale:customerPos.locked")}
          </p>
        ) : null}

        <form id="po-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {editable ? (
            <FormSection title={t("sale:customerPos.cardPo")} icon={FileTextIcon}>
              <FormField id="po-poNumber" label={t("sale:customerPos.poNumber")} required error={message(errors.poNumber)}>
                <Input id="po-poNumber" autoFocus={isNew} {...fieldProps("poNumber")} {...form.register("poNumber")} />
              </FormField>
              <FormField id="po-poDate" label={t("sale:customerPos.poDate")} required error={message(errors.poDate)}>
                <DateField id="po-poDate" control={form.control} name="poDate" clearable={false} {...fieldProps("poDate")} />
              </FormField>
              <FormField id="po-customerId" label={t("sale:fields.customer")} required error={message(errors.customerId)}>
                <Controller
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <EntitySelect
                      id="po-customerId"
                      options={customers}
                      value={field.value}
                      placeholder={t("sale:fields.chooseCustomer")}
                      {...fieldProps("customerId")}
                      onChange={(id) => {
                        field.onChange(id);
                        form.setValue("quotationId", null, { shouldDirty: true });
                      }}
                    />
                  )}
                />
              </FormField>
              <FormField id="po-quotationId" label={t("sale:customerPos.linkedQuotation")} error={message(errors.quotationId)}>
                <Controller
                  control={form.control}
                  name="quotationId"
                  render={({ field }) => (
                    <EntitySelect
                      id="po-quotationId"
                      options={quotations}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={!customerId}
                      placeholder={t("sale:customerPos.chooseQuotation")}
                      {...fieldProps("quotationId")}
                    />
                  )}
                />
              </FormField>
              <FormField id="po-note" label={t("sale:customerPos.note")} error={message(errors.note)} className="@lg:col-span-2">
                <Textarea id="po-note" {...fieldProps("note")} {...form.register("note")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t("sale:customerPos.cardPo")} icon={FileTextIcon}>
              <DetailFields
                items={[
                  { label: t("sale:customerPos.poNumber"), value: record.poNumber },
                  { label: t("sale:customerPos.poDate"), value: formatDate(record.poDate, i18n.language) },
                  { label: t("sale:fields.customer"), value: `${record.customerCode} · ${record.customerName}` },
                  { label: t("sale:customerPos.linkedQuotation"), value: record.quotationNumber },
                  { label: t("sale:customerPos.note"), value: record.note, wide: true },
                ]}
              />
            </SheetSection>
          ) : null}

          <SheetSection title={t("sale:customerPos.cardAttachment")} icon={PaperclipIcon}>
            <Controller control={form.control} name="attachment" render={({ field }) => <FileField id="po-attachment" value={field.value} onChange={(file) => field.onChange(file)} disabled={!editable} />} />
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
