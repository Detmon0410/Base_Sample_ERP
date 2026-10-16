import { Layers, Plus, Trash2, Truck } from "lucide-react";
import { useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";

import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { RecordFormPage } from "@/components/common/RecordFormPage";
import { RecordList } from "@/components/common/RecordList";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { RequirePermission } from "@/routes/RequirePermission";
import { materialsApi } from "@/services/master.service";
import { suppliersApi } from "@/services/suppliers.service";
import { formatNumber } from "@/utils/format";
import { can } from "@/utils/permissions";

const EMPTY = { code: "", name: "", contact: "", address: "", active: true, items: [] };

/** The materials this supplier sells, with the initial price a purchase order starts from. */
function ItemLines({ form, readOnly }) {
  const { t } = useTranslation("purchase");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const { data } = useLoad(() => materialsApi.list({ pageSize: 200 }), []);
  const options = [{ value: "", label: t("suppliers.items.chooseMaterial") }, ...(data?.items ?? []).map((material) => ({ value: String(material.id), label: `${material.code} ${material.name} (${material.unit})` }))];
  const errors = form.formState.errors.items;

  return (
    <Section icon={Layers} title={t("suppliers.items.title")}>
      {fields.length === 0 ? <p className="mb-3 text-muted-foreground">{t("suppliers.items.none")}</p> : null}
      <div className="flex flex-col gap-4">
        {fields.map((field, index) => (
          <div key={field.id} className="grid items-start gap-4 sm:grid-cols-[1fr_10rem_auto]">
            <SelectField label={t("suppliers.items.material")} options={options} disabled={readOnly} error={errors?.[index]?.materialId?.message} {...form.register(`items.${index}.materialId`)} />
            <TextField label={t("suppliers.items.price")} type="number" min="0" step="1" disabled={readOnly} error={errors?.[index]?.unitPrice?.message} {...form.register(`items.${index}.unitPrice`)} />
            {readOnly ? null : (
              <Button type="button" variant="outline" size="icon" className="sm:mt-6" aria-label={t("suppliers.items.remove")} title={t("suppliers.items.remove")} onClick={() => remove(index)}>
                <Trash2 aria-hidden="true" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {errors?.message ? <FieldError className="mt-2">{errors.message}</FieldError> : null}
      {readOnly ? null : (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ materialId: "", unitPrice: "" })}>
          <Plus aria-hidden="true" />
          {t("suppliers.items.add")}
        </Button>
      )}
    </Section>
  );
}

function SupplierForm() {
  const { t } = useTranslation("purchase");
  const { user } = useAuth();
  const readOnly = !can(user, "suppliers.write"); // a Factory Worker only looks
  return (
    <RecordFormPage
      api={suppliersApi}
      listPath="/master/suppliers"
      newTitle={t("suppliers.new")}
      titleOf={(record) => `${record.code} ${record.name}`}
      defaults={EMPTY}
      readOnly={readOnly}
      toForm={(record) => ({
        code: record.code,
        name: record.name,
        contact: record.contact,
        address: record.address,
        active: record.active,
        items: record.items.map((item) => ({ materialId: String(item.materialId), unitPrice: item.unitPrice })),
      })}
      toBody={(values) => values}
    >
      {({ form }) => {
        const errors = form.formState.errors;
        return (
          <>
            <Section icon={Truck} title={t("suppliers.section")}>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label={t("suppliers.code")} disabled={readOnly} error={errors.code?.message} {...form.register("code")} />
                <TextField label={t("suppliers.name")} disabled={readOnly} error={errors.name?.message} {...form.register("name")} />
                <TextField label={t("suppliers.contact")} disabled={readOnly} error={errors.contact?.message} {...form.register("contact")} />
                <TextField label={t("suppliers.address")} disabled={readOnly} error={errors.address?.message} {...form.register("address")} />
                <label className="flex flex-wrap items-center gap-3 sm:col-span-2">
                  <input type="checkbox" className="size-5" aria-label={t("suppliers.active")} disabled={readOnly} {...form.register("active")} />
                  <span className="font-semibold">{t("suppliers.active")}</span>
                  <span className="text-sm text-muted-foreground">{t("suppliers.activeHint")}</span>
                </label>
              </div>
            </Section>
            <ItemLines form={form} readOnly={readOnly} />
          </>
        );
      }}
    </RecordFormPage>
  );
}

/** Suppliers (Master data): the Admin makes and changes them, a Factory Worker looks. Each has the materials it sells and their prices. */
export function SuppliersPage() {
  const { t, i18n } = useTranslation("purchase");
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={suppliersApi}
            base="/master/suppliers"
            title={t("suppliers.title")}
            canCreate={can(user, "suppliers.write")}
            newLabel={t("suppliers.new")}
            columns={[
              { key: "code", header: t("suppliers.code") },
              { key: "name", header: t("suppliers.name") },
              { key: "contact", header: t("suppliers.contact") },
              { key: "itemCount", header: t("suppliers.itemCount"), numeric: true, cell: (row) => formatNumber(row.itemCount, i18n.language) },
              { key: "active", header: t("suppliers.active"), cell: (row) => <StatusBadge tone={row.active ? "good" : "neutral"}>{row.active ? t("suppliers.activeYes") : t("suppliers.activeNo")}</StatusBadge> },
            ]}
          />
        }
      />
      <Route element={<RequirePermission action="suppliers.write" />}>
        <Route path="new" element={<SupplierForm />} />
      </Route>
      <Route path=":id" element={<SupplierForm />} />
    </Routes>
  );
}
