import { BuildingIcon, ContactIcon, FileTextIcon, PackageIcon } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { RecordInfoCard } from "@/components/common/RecordInfoCard";
import { RecordSheet, SheetFormBody } from "@/components/common/RecordSheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_TERMS } from "@/config/masterData";
import { useRecordForm } from "@/hooks/useRecordForm";
import { supplierService } from "@/services/supplier.service";

import { SupplierMaterialsTab } from "../shared/SupplierMaterialsTab";
import { EMPTY_SUPPLIER, supplierSchema, toFormValues, toPayload } from "./supplierSchema";

/** M2 — /master/suppliers/new and /master/suppliers/:id (tabs: Details, Materials supplied) */
export function SupplierFormPage() {
  const { t } = useTranslation(["master", "nav"]);
  const page = useRecordForm({
    service: supplierService,
    schema: supplierSchema,
    emptyValues: EMPTY_SUPPLIER,
    toValues: toFormValues,
    toPayload,
    listPath: "/master/suppliers",
    idPrefix: "supplier",
  });
  const { isNew, record, form, errors, message, fieldProps } = page;

  const text = (name, label, extra = {}) => (
    <FormField id={`supplier-${name}`} label={label} error={message(errors[name])}>
      <Input id={`supplier-${name}`} {...extra} {...fieldProps(name)} {...form.register(name)} />
    </FormField>
  );

  return (
    <RecordSheet
      page={page}
      entityTitle={t("nav:items.suppliers")}
      newTitle={t("master:suppliers.new")}
      editTitle={t("master:suppliers.edit")}
      singular={t("master:suppliers.singular")}
      formId="supplier-form"
    >
      <Tabs defaultValue="details" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="details">
            <FileTextIcon className="size-4" aria-hidden="true" /> {t("master:common.tabDetails")}
          </TabsTrigger>
          <TabsTrigger value="materials" disabled={isNew}>
            <PackageIcon className="size-4" aria-hidden="true" /> {t("master:suppliers.tabMaterials")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" forceMount>
          <form id="supplier-form" noValidate onSubmit={page.onSubmit} className="flex min-h-0 flex-1 flex-col">
            <SheetFormBody>
              <FormSection title={t("master:suppliers.form.sections.basic")} icon={BuildingIcon}>
                <FormField
                  id="supplier-code"
                  label={t("master:common.code")}
                  required
                  error={message(errors.code)}
                  hint={isNew ? undefined : t("master:common.codeFixed")}
                >
                  <Input
                    id="supplier-code"
                    autoFocus={isNew}
                    readOnly={!isNew}
                    placeholder={t("master:suppliers.form.placeholders.code")}
                    className={isNew ? undefined : "bg-muted"}
                    {...fieldProps("code", !isNew)}
                    {...form.register("code")}
                  />
                </FormField>
                <FormField id="supplier-name" label={t("master:common.name")} required error={message(errors.name)}>
                  <Input id="supplier-name" {...fieldProps("name")} {...form.register("name")} />
                </FormField>
                {text("taxId", t("master:customers.form.fields.taxId"), { placeholder: t("master:customers.form.placeholders.taxId") })}
                <FormField id="supplier-paymentTerms" label={t("master:customers.form.fields.paymentTerms")} error={message(errors.paymentTerms)}>
                  <Controller
                    control={form.control}
                    name="paymentTerms"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger id="supplier-paymentTerms" className="w-full" {...fieldProps("paymentTerms")}>
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
                <FormField id="supplier-address" label={t("master:customers.form.fields.address")} error={message(errors.address)} className="@lg:col-span-2">
                  <Textarea id="supplier-address" {...fieldProps("address")} {...form.register("address")} />
                </FormField>
              </FormSection>

              <FormSection title={t("master:suppliers.form.sections.contact")} icon={ContactIcon}>
                {text("contactPerson", t("master:customers.form.fields.contactPerson"))}
                {text("contactPhone", t("master:customers.form.fields.contactPhone"), { type: "tel" })}
                {text("contactEmail", t("master:customers.form.fields.contactEmail"), { type: "email" })}
              </FormSection>

              {!isNew ? <RecordInfoCard record={record} /> : null}
            </SheetFormBody>
          </form>
        </TabsContent>

        <TabsContent value="materials">{!isNew ? <SupplierMaterialsTab mode="supplier" ownerId={record.id} /> : null}</TabsContent>
      </Tabs>
    </RecordSheet>
  );
}
