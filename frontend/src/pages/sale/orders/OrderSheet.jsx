import { CalendarIcon, LinkIcon } from "lucide-react";
import { Controller, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { ApprovalActions } from "@/components/common/ApprovalActions";
import { DetailFields } from "@/components/common/DetailLayout";
import { DateField } from "@/components/common/DateField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { SheetFormBody } from "@/components/common/RecordSheet";
import { SheetSection } from "@/components/common/SheetSection";
import { AvailabilityCard } from "@/components/documents/AvailabilityCard";
import { DocumentActions } from "@/components/documents/DocumentActions";
import { HistoryCard } from "@/components/documents/DocumentInfoCards";
import { DocumentSheet } from "@/components/documents/DocumentSheet";
import { LineItemsCard } from "@/components/documents/LineItemsCard";
import { Textarea } from "@/components/ui/textarea";
import { canWork, orderActions } from "@/config/sale";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerDocuments } from "@/hooks/useCustomerDocuments";
import { useDefaultPrices } from "@/hooks/useDefaultPrices";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { customerService } from "@/services/customer.service";
import { productService } from "@/services/product.service";
import { customerPoService, quotationService, saleOrderService } from "@/services/sale.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";
import { formatDate } from "@/utils/format";
import { notifyMasterChanged } from "@/utils/masterEvents";

import { saleErrorText } from "../saleErrors";
import { emptyOrder, orderSchema, toFormValues, toPayload } from "./orderSchema";

const ACCEPTED = { status: "accepted" };
const NO_FILTER = {};
const quotationNumber = (doc) => doc.number;
const quotationLabel = (doc) => doc.date;
const poNumber = (doc) => doc.poNumber;
const poLabel = (doc) => doc.poDate;
const DELIVERED_COLUMN = ["ready_to_deliver", "delivered", "closed"];

/** S6 + S7 — /sale/orders/new and /sale/orders/:id (a draft is editable, every other status is read-only). */
export function OrderSheet() {
  const { t, i18n } = useTranslation(["sale", "nav"]);
  const { user } = useAuth();
  const navigate = useNavigate();
  const page = useRecordForm({
    service: saleOrderService,
    schema: orderSchema,
    emptyValues: emptyOrder(),
    toValues: toFormValues,
    toPayload,
    listPath: "/sale/orders",
    idPrefix: "so",
    afterCreatePath: (doc) => `/sale/orders/${doc.id}`,
  });
  const { isNew, record, form, errors, message, fieldProps } = page;
  const { options: customers } = useOptions(customerService);
  const { options: products } = useOptions(productService);
  const { options: employees } = useOptions(simpleMasterServices.employees);
  const { onProductPicked, repriceAll } = useDefaultPrices(form);
  const lines = useWatch({ control: form.control, name: "lines" });
  const customerId = form.watch("customerId");
  const quotations = useCustomerDocuments(quotationService, customerId, ACCEPTED, { numberOf: quotationNumber, labelOf: quotationLabel });
  const customerPos = useCustomerDocuments(customerPoService, customerId, NO_FILTER, { numberOf: poNumber, labelOf: poLabel });

  const pending = record?.approval === "requested";
  // A draft that waits for a Manager is not edited meanwhile (spec 3.3); the Manager can reject it to send it back.
  const editable = isNew || (record?.status === "draft" && !pending && canWork(user));
  const actions = !isNew && record ? orderActions(record, user) : [];

  const run = async (action, note) => {
    try {
      if (action.key === "create-delivery-note") {
        const dn = await saleOrderService.createDeliveryNote(record.id);
        toast.success(t("sale:toast.deliveryNoteCreated", { number: dn.number }));
        notifyMasterChanged();
        navigate(`/sale/deliveries/${dn.id}`);
        return;
      }
      const saved = await saleOrderService.run(record.id, action.key, { note });
      page.applyRecord(saved);
      toast.success(t(`sale:actions.${action.key}.done`));
    } catch (error) {
      toast.error(saleErrorText(t, error));
      throw error;
    }
  };

  // Manager / Admin on a draft that waits: Approve (confirms) and Reject (back to the requester, reason needed).
  const approval = !isNew && record?.status === "draft" ? (
    <ApprovalActions
      department="Sale"
      pending={pending}
      onApprove={() => run({ key: "approve" }, "").catch(() => {})}
      onReject={(reason) => run({ key: "reject-confirm" }, reason).catch(() => {})}
    />
  ) : null;

  return (
    <DocumentSheet
      page={page}
      entityTitle={t("nav:items.saleOrders")}
      newTitle={t("sale:orders.new")}
      titleOf={(doc) => doc.number}
      status={record?.status}
      waiting={pending}
      singular={t("sale:orders.singular")}
      printKind="order"
      formId="so-form"
      canEdit={editable}
      actions={
        <>
          {approval}
          <DocumentActions actions={actions} onRun={run} disabled={form.formState.isDirty} />
        </>
      }
    >
      <SheetFormBody>
        <form id="so-form" noValidate onSubmit={page.onSubmit} className="flex flex-col gap-4">
          {editable ? (
            <>
              <FormSection title={t("sale:cards.header")} icon={CalendarIcon}>
                <FormField id="so-customerId" label={t("sale:fields.customer")} required error={message(errors.customerId)}>
                  <Controller
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <EntitySelect
                        id="so-customerId"
                        options={customers}
                        value={field.value}
                        placeholder={t("sale:fields.chooseCustomer")}
                        {...fieldProps("customerId")}
                        onChange={(id) => {
                          field.onChange(id);
                          // the references belong to the old customer
                          form.setValue("quotationId", null, { shouldDirty: true });
                          form.setValue("customerPoId", null, { shouldDirty: true });
                          repriceAll(id);
                        }}
                      />
                    )}
                  />
                </FormField>
                <FormField id="so-salesPersonId" label={t("sale:fields.salesPerson")} error={message(errors.salesPersonId)}>
                  <Controller
                    control={form.control}
                    name="salesPersonId"
                    render={({ field }) => (
                      <EntitySelect id="so-salesPersonId" options={employees} value={field.value} onChange={field.onChange} placeholder={t("sale:fields.chooseSalesPerson")} {...fieldProps("salesPersonId")} />
                    )}
                  />
                </FormField>
                <FormField id="so-date" label={t("sale:fields.date")} required error={message(errors.date)}>
                  <DateField id="so-date" control={form.control} name="date" onValueChange={() => repriceAll()} {...fieldProps("date")} />
                </FormField>
                <FormField id="so-deliveryDate" label={t("sale:fields.deliveryDate")} error={message(errors.deliveryDate)}>
                  <DateField id="so-deliveryDate" control={form.control} name="deliveryDate" {...fieldProps("deliveryDate")} />
                </FormField>
                <FormField id="so-remarks" label={t("sale:fields.remarks")} error={message(errors.remarks)} className="@lg:col-span-2">
                  <Textarea id="so-remarks" {...fieldProps("remarks")} {...form.register("remarks")} />
                </FormField>
              </FormSection>

              <FormSection title={t("sale:cards.reference")} icon={LinkIcon}>
                <FormField id="so-quotationId" label={t("sale:fields.quotation")} error={message(errors.quotationId)}>
                  <Controller
                    control={form.control}
                    name="quotationId"
                    render={({ field }) => (
                      <EntitySelect id="so-quotationId" options={quotations} value={field.value} onChange={field.onChange} disabled={!customerId} placeholder={t("sale:fields.chooseQuotation")} {...fieldProps("quotationId")} />
                    )}
                  />
                </FormField>
                <FormField id="so-customerPoId" label={t("sale:fields.customerPo")} error={message(errors.customerPoId)}>
                  <Controller
                    control={form.control}
                    name="customerPoId"
                    render={({ field }) => (
                      <EntitySelect id="so-customerPoId" options={customerPos} value={field.value} onChange={field.onChange} disabled={!customerId} placeholder={t("sale:fields.chooseCustomerPo")} {...fieldProps("customerPoId")} />
                    )}
                  />
                </FormField>
              </FormSection>
            </>
          ) : record ? (
            <SheetSection title={t("sale:cards.header")} icon={CalendarIcon}>
              <DetailFields
                items={[
                  { label: t("sale:fields.customer"), value: `${record.customerCode} · ${record.customerName}` },
                  { label: t("sale:fields.salesPerson"), value: record.salesPersonName },
                  { label: t("sale:fields.date"), value: formatDate(record.date, i18n.language) },
                  { label: t("sale:fields.deliveryDate"), value: record.deliveryDate ? formatDate(record.deliveryDate, i18n.language) : "" },
                  { label: t("sale:fields.quotation"), value: record.quotationNumber },
                  { label: t("sale:fields.customerPo"), value: record.customerPoNumber },
                  { label: t("sale:fields.remarks"), value: record.remarks, wide: true },
                ]}
              />
            </SheetSection>
          ) : null}

          <LineItemsCard
            form={form}
            products={products}
            readOnly={!editable}
            rows={record?.lines}
            showDelivered={DELIVERED_COLUMN.includes(record?.status)}
            onProductPicked={onProductPicked}
          />
        </form>

        {/* outside the form: checking availability never submits it */}
        <AvailabilityCard lines={editable ? lines : record?.lines} />
        {!isNew && record ? (
          <>
            <HistoryCard history={record.history} />
          </>
        ) : null}
      </SheetFormBody>
    </DocumentSheet>
  );
}
