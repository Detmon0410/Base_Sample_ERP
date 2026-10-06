import { BuildingIcon, ContactIcon, WalletIcon } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { MoneyInput } from "@/components/common/MoneyInput";
import { RecordInfoCard } from "@/components/common/RecordInfoCard";
import { RecordSheet, SheetFormBody } from "@/components/common/RecordSheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_TERMS } from "@/config/masterData";
import { useRecordForm } from "@/hooks/useRecordForm";
import { customerService } from "@/services/customer.service";

import { customerSchema, EMPTY_CUSTOMER, toFormValues, toPayload } from "./customerSchema";

/** M1 — /master/customers/new and /master/customers/:id */
export function CustomerFormPage() {
  const { t } = useTranslation(["master", "nav"]);
  const page = useRecordForm({
    service: customerService,
    schema: customerSchema,
    emptyValues: EMPTY_CUSTOMER,
    toValues: toFormValues,
    toPayload,
    listPath: "/master/customers",
    idPrefix: "customer",
  });
  const { isNew, record, form, errors, message, fieldProps } = page;

  const text = (name, label, extra = {}, className) => (
    <FormField id={`customer-${name}`} label={label} error={message(errors[name])} className={className}>
      <Input id={`customer-${name}`} {...extra} {...fieldProps(name)} {...form.register(name)} />
    </FormField>
  );

  return (
    <RecordSheet
      page={page}
      entityTitle={t("nav:items.customers")}
      newTitle={t("master:customers.new")}
      editTitle={t("master:customers.edit")}
      singular={t("master:customers.singular")}
      formId="customer-form"
    >
      <form id="customer-form" noValidate onSubmit={page.onSubmit} className="flex min-h-0 flex-1 flex-col">
        <SheetFormBody>
          <FormSection title={t("master:customers.form.sections.basic")} icon={BuildingIcon} aside={isNew ? undefined : <span>{record.code}</span>}>
            <FormField
              id="customer-code"
              label={t("master:customers.form.fields.code")}
              required
              error={message(errors.code)}
              hint={isNew ? undefined : t("master:common.codeFixed")}
            >
              <Input
                id="customer-code"
                autoFocus={isNew}
                readOnly={!isNew}
                placeholder={t("master:customers.form.placeholders.code")}
                className={isNew ? undefined : "bg-muted"}
                {...fieldProps("code", !isNew)}
                {...form.register("code")}
              />
            </FormField>
            <FormField id="customer-name" label={t("master:customers.form.fields.name")} required error={message(errors.name)}>
              <Input id="customer-name" {...fieldProps("name")} {...form.register("name")} />
            </FormField>
            {text("taxId", t("master:customers.form.fields.taxId"), { placeholder: t("master:customers.form.placeholders.taxId") })}
            <FormField id="customer-address" label={t("master:customers.form.fields.address")} error={message(errors.address)} className="@lg:col-span-2">
              <Textarea id="customer-address" {...fieldProps("address")} {...form.register("address")} />
            </FormField>
          </FormSection>

          <FormSection title={t("master:customers.form.sections.billing")} icon={WalletIcon}>
            <FormField id="customer-paymentTerms" label={t("master:customers.form.fields.paymentTerms")} error={message(errors.paymentTerms)}>
              <Controller
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="customer-paymentTerms" className="w-full" {...fieldProps("paymentTerms")}>
                      <SelectValue placeholder={t("master:customers.form.placeholders.paymentTerms")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((term) => (
                        <SelectItem key={term} value={term}>
                          {t(`master:paymentTerms.${term}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField id="customer-creditLimit" label={t("master:customers.form.fields.creditLimit")} error={message(errors.creditLimit)}>
              <MoneyInput
                id="customer-creditLimit"
                placeholder={t("master:customers.form.placeholders.creditLimit")}
                {...fieldProps("creditLimit")}
                {...form.register("creditLimit", { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })}
              />
            </FormField>
          </FormSection>

          <FormSection title={t("master:customers.form.sections.contact")} icon={ContactIcon}>
            {text("contactPerson", t("master:customers.form.fields.contactPerson"))}
            {text("contactPhone", t("master:customers.form.fields.contactPhone"), { type: "tel" })}
            {text("contactEmail", t("master:customers.form.fields.contactEmail"), { type: "email" }, "@lg:col-span-2")}
          </FormSection>

          {!isNew ? <RecordInfoCard record={record} /> : null}
        </SheetFormBody>
      </form>
    </RecordSheet>
  );
}
