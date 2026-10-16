import { Layers, Package, Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";

import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { RecordFormPage } from "@/components/common/RecordFormPage";
import { RecordList } from "@/components/common/RecordList";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useAuth } from "@/hooks/useAuth";
import { RequirePermission } from "@/routes/RequirePermission";
import { useLoad } from "@/hooks/useLoad";
import { formatCurrency, formatNumber } from "@/utils/format";
import { materialsApi, productsApi } from "@/services/master.service";
import { can } from "@/utils/permissions";

const EMPTY = { code: "", name: "", price: "", bom: [] };

/** The BOM: the materials and the quantity of each for one product (reference only; nothing is taken from the stock). */
function BomLines({ form, readOnly }) {
  const { t } = useTranslation("master");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "bom" });
  const { data } = useLoad(() => materialsApi.list({ pageSize: 200 }), []);
  const options = [{ value: "", label: t("products.chooseMaterial") }, ...(data?.items ?? []).map((material) => ({ value: String(material.id), label: `${material.code} ${material.name}` }))];
  const errors = form.formState.errors.bom;

  return (
    <Section icon={Layers} title={t("products.bom")}>
      {fields.length === 0 ? <p className="mb-3 text-muted-foreground">{t("products.noBom")}</p> : null}
      <div className="flex flex-col gap-4">
        {fields.map((field, index) => (
          <div key={field.id} className="grid items-start gap-4 sm:grid-cols-[1fr_9rem_auto]">
            <SelectField
              label={t("products.material")}
              options={options}
              disabled={readOnly}
              error={errors?.[index]?.materialId?.message}
              {...form.register(`bom.${index}.materialId`)}
            />
            <TextField
              label={t("products.quantity")} placeholder={t("examples:bomQuantity")}
              type="number"
              min="0"
              step="0.001"
              disabled={readOnly}
              error={errors?.[index]?.quantity?.message}
              {...form.register(`bom.${index}.quantity`)}
            />
            {readOnly ? null : (
              <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive sm:mt-5" aria-label={t("products.removeLine")} title={t("products.removeLine")} onClick={() => remove(index)}>
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {errors?.message ? <FieldError className="mt-2">{errors.message}</FieldError> : null}
      {readOnly ? null : (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ materialId: "", quantity: "" })}>
          <Plus aria-hidden="true" />
          {t("products.addLine")}
        </Button>
      )}
    </Section>
  );
}

function ProductForm() {
  const { t } = useTranslation("master");
  const { user } = useAuth();
  const readOnly = !can(user, "products.write");
  return (
    <RecordFormPage
      api={productsApi}
      listPath="/master/products"
      newTitle={t("products.new")}
      titleOf={(record) => `${record.code} ${record.name}`}
      defaults={EMPTY}
      readOnly={readOnly}
      toForm={(record) => ({ code: record.code, name: record.name, price: record.price, bom: record.bom.map((line) => ({ materialId: String(line.materialId), quantity: line.quantity })) })}
      toBody={(values) => ({ ...values, bom: values.bom })}
    >
      {({ form }) => {
        const errors = form.formState.errors;
        return (
          <>
            <Section icon={Package} title={t("products.section")}>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label={t("products.code")} placeholder={t("examples:productCode")} disabled={readOnly} error={errors.code?.message} {...form.register("code")} />
                <TextField label={t("products.price")} placeholder={t("examples:price")} type="number" min="0" step="1" disabled={readOnly} error={errors.price?.message} {...form.register("price")} />
                <TextField label={t("products.name")} placeholder={t("examples:productName")} disabled={readOnly} error={errors.name?.message} className="sm:col-span-2" {...form.register("name")} />
              </div>
            </Section>
            <BomLines form={form} readOnly={readOnly} />
          </>
        );
      }}
    </RecordFormPage>
  );
}

/** Products and BOM: the list (the Worker only reads), a new product, one product. */
export function ProductsPage() {
  const { t, i18n } = useTranslation("master");
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={productsApi}
            base="/master/products"
            title={t("products.title")}
            canCreate={can(user, "products.write")}
            newLabel={t("products.new")}
            columns={[
              { key: "code", header: t("products.code") },
              { key: "name", header: t("products.name") },
              { key: "price", header: t("products.price"), numeric: true, cell: (row) => formatCurrency(row.price, i18n.language) },
              { key: "bom", header: t("products.bomLines"), numeric: true, cell: (row) => formatNumber(row.bom.length, i18n.language) },
            ]}
          />
        }
      />
      <Route element={<RequirePermission action="products.write" />}>
        <Route path="new" element={<ProductForm />} />
      </Route>
      <Route path=":id" element={<ProductForm />} />
    </Routes>
  );
}
