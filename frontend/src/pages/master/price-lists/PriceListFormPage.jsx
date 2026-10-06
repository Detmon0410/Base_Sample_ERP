import { BoxIcon, CalendarRangeIcon } from "lucide-react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { DateField } from "@/components/common/DateField";
import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { MoneyInput } from "@/components/common/MoneyInput";
import { RecordInfoCard } from "@/components/common/RecordInfoCard";
import { RecordSheet, SheetFormBody } from "@/components/common/RecordSheet";
import { Input } from "@/components/ui/input";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { customerService } from "@/services/customer.service";
import { priceListService } from "@/services/priceList.service";
import { productService } from "@/services/product.service";

import { EMPTY_PRICE, priceListSchema, toFormValues, toPayload } from "./priceListSchema";

/** M10 — /master/price-lists/new and /master/price-lists/:id */
export function PriceListFormPage() {
  const { t } = useTranslation(["master", "nav"]);
  const page = useRecordForm({
    service: priceListService,
    schema: priceListSchema,
    emptyValues: EMPTY_PRICE,
    toValues: toFormValues,
    toPayload,
    listPath: "/master/price-lists",
    idPrefix: "price",
    fieldErrors: { PERIOD_OVERLAP: "validFrom" },
  });
  const { isNew, record, form, errors, message, fieldProps } = page;
  const { options: products } = useOptions(productService);
  const { options: customers } = useOptions(customerService);

  // After creation the product and the customer are fixed (like a code): to price another pair, add a new price.
  const select = (name, label, options, placeholder) => {
    const current = isNew ? null : { code: record[name === "productId" ? "productCode" : "customerCode"], name: record[name === "productId" ? "productName" : "customerName"] };
    return (
      <FormField
        id={`price-${name}`}
        label={label}
        required
        error={message(errors[name])}
        hint={isNew ? undefined : t("master:priceLists.form.hints.pairFixed")}
      >
        {isNew ? (
          <Controller
            control={form.control}
            name={name}
            render={({ field }) => (
              <EntitySelect
                id={`price-${name}`}
                options={options}
                value={field.value}
                onChange={field.onChange}
                placeholder={placeholder}
                {...fieldProps(name)}
              />
            )}
          />
        ) : (
          <Input id={`price-${name}`} readOnly className="bg-muted" value={`${current.code} · ${current.name}`} aria-describedby={`price-${name}-hint`} />
        )}
      </FormField>
    );
  };

  return (
    <RecordSheet
      page={page}
      entityTitle={t("nav:items.priceLists")}
      newTitle={t("master:priceLists.new")}
      editTitle={t("master:priceLists.edit")}
      titleOf={(row) => `${row.productCode} · ${row.customerCode}`}
      singular={t("master:priceLists.singular")}
      formId="price-form"
    >
      <form id="price-form" noValidate onSubmit={page.onSubmit} className="flex min-h-0 flex-1 flex-col">
        <SheetFormBody>
          <FormSection title={t("master:priceLists.form.sections.pair")} icon={BoxIcon}>
            {select("productId", t("master:priceLists.form.fields.productId"), products, t("master:priceLists.form.placeholders.product"))}
            {select("customerId", t("master:priceLists.form.fields.customerId"), customers, t("master:priceLists.form.placeholders.customer"))}
          </FormSection>

          <FormSection title={t("master:priceLists.form.sections.price")} icon={CalendarRangeIcon}>
            <FormField
              id="price-price"
              label={t("master:priceLists.form.fields.price")}
              required
              error={message(errors.price)}
              hint={t("master:priceLists.form.hints.price")}
              className="@lg:col-span-2"
            >
              <MoneyInput
                id="price-price"
                placeholder="0"
                {...fieldProps("price", true)}
                {...form.register("price", { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })}
              />
            </FormField>
            <FormField id="price-validFrom" label={t("master:priceLists.form.fields.validFrom")} required error={message(errors.validFrom)}>
              <DateField id="price-validFrom" control={form.control} name="validFrom" clearable={false} {...fieldProps("validFrom")} />
            </FormField>
            <FormField
              id="price-validTo"
              label={t("master:priceLists.form.fields.validTo")}
              error={message(errors.validTo)}
              hint={t("master:priceLists.form.hints.validTo")}
            >
              <DateField id="price-validTo" control={form.control} name="validTo" min={form.watch("validFrom")} {...fieldProps("validTo", true)} />
            </FormField>
          </FormSection>

          {!isNew ? <RecordInfoCard record={record} /> : null}
        </SheetFormBody>
      </form>
    </RecordSheet>
  );
}
