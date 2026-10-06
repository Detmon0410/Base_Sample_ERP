import { BoxIcon, FileTextIcon, ListTreeIcon, RouteIcon } from "lucide-react";
import { useMemo } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { EntitySelect } from "@/components/common/EntitySelect";
import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { MoneyInput } from "@/components/common/MoneyInput";
import { RecordInfoCard } from "@/components/common/RecordInfoCard";
import { RecordSheet, SheetFormBody } from "@/components/common/RecordSheet";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOptions } from "@/hooks/useOptions";
import { useRecordForm } from "@/hooks/useRecordForm";
import { productService } from "@/services/product.service";
import { simpleMasterServices } from "@/services/simpleMaster.service";

import { ProductBomTab } from "./ProductBomTab";
import { ProductRoutingTab } from "./ProductRoutingTab";
import { EMPTY_PRODUCT, productSchema, toFormValues } from "./productSchema";

/** M3 — /master/products/new and /master/products/:id (tabs: Details, BOM, Routing) */
export function ProductFormPage() {
  const { t } = useTranslation(["master", "nav"]);
  const page = useRecordForm({
    service: productService,
    schema: productSchema,
    emptyValues: EMPTY_PRODUCT,
    toValues: toFormValues,
    listPath: "/master/products",
    idPrefix: "product",
  });
  const { isNew, record, form, errors, message, fieldProps } = page;
  const { options: uoms } = useOptions(simpleMasterServices.uom);
  const { options: products } = useOptions(productService);

  const uomOptions = useMemo(() => uoms.map((unit) => ({ ...unit, id: unit.code })), [uoms]);
  // Category is free text; the ones already used are offered as suggestions (F3 spec Q2).
  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);

  return (
    <RecordSheet
      page={page}
      entityTitle={t("nav:items.products")}
      newTitle={t("master:products.new")}
      editTitle={t("master:products.edit")}
      singular={t("master:products.singular")}
      formId="product-form"
    >
      <Tabs defaultValue="details" className="min-h-0 flex-1">
        <TabsList>
          <TabsTrigger value="details">
            <FileTextIcon className="size-4" aria-hidden="true" /> {t("master:common.tabDetails")}
          </TabsTrigger>
          <TabsTrigger value="bom" disabled={isNew}>
            <ListTreeIcon className="size-4" aria-hidden="true" /> {t("master:products.tabBom")}
          </TabsTrigger>
          <TabsTrigger value="routing" disabled={isNew}>
            <RouteIcon className="size-4" aria-hidden="true" /> {t("master:products.tabRouting")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" forceMount>
          <form id="product-form" noValidate onSubmit={page.onSubmit} className="flex min-h-0 flex-1 flex-col">
            <SheetFormBody>
              <FormSection title={t("master:products.form.sections.basic")} icon={BoxIcon}>
                <FormField
                  id="product-code"
                  label={t("master:common.code")}
                  required
                  error={message(errors.code)}
                  hint={isNew ? undefined : t("master:common.codeFixed")}
                >
                  <Input
                    id="product-code"
                    autoFocus={isNew}
                    readOnly={!isNew}
                    placeholder={t("master:products.form.placeholders.code")}
                    className={isNew ? undefined : "bg-muted"}
                    {...fieldProps("code", !isNew)}
                    {...form.register("code")}
                  />
                </FormField>
                <FormField id="product-name" label={t("master:common.name")} required error={message(errors.name)}>
                  <Input id="product-name" {...fieldProps("name")} {...form.register("name")} />
                </FormField>
                <FormField id="product-uom" label={t("master:materials.form.fields.uom")} required error={message(errors.uom)}>
                  <Controller
                    control={form.control}
                    name="uom"
                    render={({ field }) => (
                      <EntitySelect
                        id="product-uom"
                        options={uomOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={t("master:materials.form.placeholders.uom")}
                        {...fieldProps("uom")}
                      />
                    )}
                  />
                </FormField>
                <FormField id="product-category" label={t("master:products.form.fields.category")} error={message(errors.category)}>
                  <Input id="product-category" list="product-categories" autoComplete="off" {...fieldProps("category")} {...form.register("category")} />
                  <datalist id="product-categories">
                    {categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </FormField>
                <FormField
                  id="product-sellingPrice"
                  label={t("master:products.form.fields.sellingPrice")}
                  error={message(errors.sellingPrice)}
                  hint={t("master:products.form.hints.sellingPrice")}
                >
                  <MoneyInput
                    id="product-sellingPrice"
                    placeholder="0"
                    {...fieldProps("sellingPrice", true)}
                    {...form.register("sellingPrice", { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) })}
                  />
                </FormField>
              </FormSection>

              {!isNew ? <RecordInfoCard record={record} /> : null}
            </SheetFormBody>
          </form>
        </TabsContent>

        <TabsContent value="bom">{!isNew ? <ProductBomTab productId={record.id} /> : null}</TabsContent>
        <TabsContent value="routing">{!isNew ? <ProductRoutingTab productId={record.id} /> : null}</TabsContent>
      </Tabs>
    </RecordSheet>
  );
}
