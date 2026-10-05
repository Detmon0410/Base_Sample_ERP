import { CalendarIcon, TriangleAlertIcon } from "lucide-react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { EntitySelect } from "@/components/common/EntitySelect";
import { DetailFields } from "@/components/common/DetailLayout";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { SheetSection } from "@/components/common/SheetSection";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { AvailabilityCard } from "@/components/documents/AvailabilityCard";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { HistoryCard, LinksCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { LineItemsCard } from "@/components/documents/LineItemsCard";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { canWork, quotationActions } from "@/config/sale";
import { useAuth } from "@/hooks/useAuth";
import { useDefaultPrices } from "@/hooks/useDefaultPrices";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { customerService } from "@/services/customer.service";
import { productService } from "@/services/product.service";
import { quotationService } from "@/services/sale.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatDate } from "@/utils/format";
import { notifyMasterChanged } from "@/utils/masterEvents";

import { saleErrorText } from "../saleErrors";
import { emptyQuotation, quotationSchema, toFormValues } from "./quotationSchema";

/** S2 + S3 — /sale/quotations/new and /sale/quotations/:id (a draft is editable, every other status is read-only). */
export function QuotationSheet() {
  const { t, i18n } = useTranslation(["sale", "nav"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const page = useRecordForm({
    service: quotationService,
    schema: quotationSchema,
    emptyValues: emptyQuotation(),
    toValues: toFormValues,
    listPath: "/sale/quotations",
    idPrefix: "qt",
    afterCreatePath: (doc) => `/sale/quotations/${doc.id}`,
  });
  const { isNew, record, form, errors, message, fieldProps } = page;
  const { options: customers } = useOptions(customerService);
  const { options: products } = useOptions(productService);
  const { options: employees } = useOptions(simpleMasterServices.employees);
  const { onProductPicked, repriceAll } = useDefaultPrices(form);
  const lines = useWatch({ control: form.control, name: "lines" });

  const editable = isNew || (record?.status === "draft" && canWork(user));
  const actions = !isNew && record ? quotationActions(record, user) : [];

  const run = async (action, note) => {
    try {
      if (action.key === "create-order") {
        const order = await quotationService.createOrder(record.id);
        toast.success(t("sale:toast.orderCreated", { number: order.number }));
        notifyMasterChanged();
        navigate(`/sale/orders/${order.id}`);
        return;
      }
      const saved = await quotationService.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`sale:actions.${action.key}.done`));
    } catch (error) {
      toast.error(saleErrorText(t, error));
      throw error;
    }
  };

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.quotations")}
      newTitle={t("sale:quotations.new")}
      titleOf={(doc) => doc.number}
      status={record?.status}
      singular={t("sale:quotations.singular")}
      formId="qt-form"
      canEdit={editable}
      actions={<DocumentActions actions={actions} onRun={run} disabled={form.formState.isDirty} />}
    >
      <SheetFormBody>
        <form id="qt-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {record?.pastValidUntil ? (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-warning">
              <TriangleAlertIcon className="size-5 shrink-0" aria-hidden="true" /> {t("sale:quotations.pastValidUntil")}
            </p>
          ) : null}

          {editable ? (
            <FormSection title={t("sale:cards.header")} icon={CalendarIcon}>
              <FormField id="qt-customerId" label={t("sale:fields.customer")} required error={message(errors.customerId)}>
                <Controller
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <EntitySelect
                      id="qt-customerId"
                      options={customers}
                      value={field.value}
                      placeholder={t("sale:fields.chooseCustomer")}
                      {...fieldProps("customerId")}
                      onChange={(id) => {
                        field.onChange(id);
                        repriceAll(id);
                      }}
                    />
                  )}
                />
              </FormField>
              <FormField id="qt-salesPersonId" label={t("sale:fields.salesPerson")} error={message(errors.salesPersonId)}>
                <Controller
                  control={form.control}
                  name="salesPersonId"
                  render={({ field }) => (
                    <EntitySelect id="qt-salesPersonId" options={employees} value={field.value} onChange={field.onChange} placeholder={t("sale:fields.chooseSalesPerson")} {...fieldProps("salesPersonId")} />
                  )}
                />
              </FormField>
              <FormField id="qt-date" label={t("sale:fields.date")} required error={message(errors.date)}>
                <Input id="qt-date" type="date" {...fieldProps("date")} {...form.register("date", { onChange: () => repriceAll() })} />
              </FormField>
              <FormField id="qt-validUntil" label={t("sale:fields.validUntil")} required error={message(errors.validUntil)}>
                <Input id="qt-validUntil" type="date" {...fieldProps("validUntil")} {...form.register("validUntil")} />
              </FormField>
              <FormField id="qt-remarks" label={t("sale:fields.remarks")} error={message(errors.remarks)} className="@lg:col-span-2">
                <Textarea id="qt-remarks" {...fieldProps("remarks")} {...form.register("remarks")} />
              </FormField>
            </FormSection>
          ) : record ? (
            <SheetSection title={t("sale:cards.header")} icon={CalendarIcon}>
              <DetailFields
                items={[
                  { label: t("sale:fields.customer"), value: `${record.customerCode} · ${record.customerName}` },
                  { label: t("sale:fields.salesPerson"), value: record.salesPersonName },
                  { label: t("sale:fields.date"), value: formatDate(record.date, i18n.language) },
                  { label: t("sale:fields.validUntil"), value: formatDate(record.validUntil, i18n.language) },
                  { label: t("sale:fields.remarks"), value: record.remarks, wide: true },
                ]}
              />
            </SheetSection>
          ) : null}

          <LineItemsCard form={form} products={products} readOnly={!editable} rows={record?.lines} onProductPicked={onProductPicked} />
        </form>

        {/* outside the form: checking availability never submits it */}
        <AvailabilityCard lines={editable ? lines : record?.lines} />
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
