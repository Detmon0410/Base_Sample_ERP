import { ClipboardList, Package, Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { RecordFormPage } from "@/components/common/RecordFormPage";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useLoad } from "@/hooks/useLoad";
import { materialsApi } from "@/services/master.service";
import { purchaseApi } from "@/services/purchase.service";
import { suppliersApi } from "@/services/suppliers.service";
import { todayIso } from "@/utils/dates";
import { formatCurrency } from "@/utils/format";
import { DEPARTMENTS } from "@/utils/permissions";

const emptyLine = () => ({ materialId: "", quantity: "", unitPrice: "" });

/** The lines of the PO: only the materials of the chosen supplier; the price starts from the price of the supplier, the unit is the material's. */
function PoLines({ form }) {
  const { t, i18n } = useTranslation("purchase");
  const supplierId = useWatch({ control: form.control, name: "supplierId" });
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const { data: supplier } = useLoad(() => (supplierId ? suppliersApi.get(supplierId) : Promise.resolve(null)), [supplierId]);
  const ready = !supplierId || supplier?.id === Number(supplierId); // the rows wait for the materials of the supplier
  const items = supplierId && ready ? (supplier?.items ?? []) : [];
  const errors = form.formState.errors.lines;
  const options = [{ value: "", label: t("lines.chooseMaterial") }, ...items.map((item) => ({ value: String(item.materialId), label: `${item.materialCode} ${item.materialName}` }))];
  const amountOf = (line) => Math.round((Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0));
  const total = lines.reduce((sum, line) => sum + amountOf(line), 0);

  return (
    <Section icon={Package} title={t("lines.title")}>
      {!supplierId ? <p className="text-muted-foreground">{t("form.pickSupplier")}</p> : null}
      {supplierId && ready && fields.length === 0 ? <p className="mb-3 text-muted-foreground">{t("lines.none")}</p> : null}
      <div className="flex flex-col gap-4">
        {(ready ? fields : []).map((field, index) => {
          const item = items.find((entry) => String(entry.materialId) === String(lines[index]?.materialId));
          return (
            <div key={field.id} className="grid items-start gap-4 sm:grid-cols-[1fr_8rem_5rem_9rem_9rem_auto]">
              <SelectField
                label={t("lines.material")}
                options={options}
                error={errors?.[index]?.materialId?.message}
                {...form.register(`lines.${index}.materialId`, {
                  // the price of the supplier is the starting price of the line
                  onChange: (event) => {
                    const chosen = items.find((entry) => String(entry.materialId) === event.target.value);
                    if (chosen) form.setValue(`lines.${index}.unitPrice`, chosen.unitPrice);
                  },
                })}
              />
              <TextField label={t("lines.quantity")} placeholder={t("examples:quantity")} type="number" min="0" step="0.001" error={errors?.[index]?.quantity?.message} {...form.register(`lines.${index}.quantity`)} />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{t("lines.unit")}</span>
                <span className="pt-2">{item?.unit ?? "-"}</span>
              </div>
              <TextField label={t("lines.unitPrice")} placeholder={t("examples:smallPrice")} type="number" min="0" step="1" error={errors?.[index]?.unitPrice?.message} {...form.register(`lines.${index}.unitPrice`)} />
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold">{t("lines.amount")}</span>
                <span className="pt-2 font-bold">{formatCurrency(amountOf(lines[index]), i18n.language)}</span>
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive sm:mt-5" aria-label={t("lines.remove")} title={t("lines.remove")} onClick={() => remove(index)}>
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          );
        })}
      </div>
      {errors?.message ? <FieldError className="mt-2">{errors.message}</FieldError> : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" disabled={!supplierId} onClick={() => append(emptyLine())}>
          <Plus aria-hidden="true" />
          {t("lines.add")}
        </Button>
        <p className="text-lg font-bold">
          {t("lines.total")}: {formatCurrency(total, i18n.language)}
        </p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{t("form.noPrice")}</p>
    </Section>
  );
}

/** The form of a PO: new (also from "Create PO" of a material that is low: `?material=<id>`) or a Draft to change. */
function PoFields({ form }) {
  const { t } = useTranslation(["purchase", "master"]);
  const notesId = useId();
  const { data } = useLoad(() => suppliersApi.list({ active: "true", pageSize: 200 }), []);
  const errors = form.formState.errors;
  const suppliers = [{ value: "", label: t("purchase:form.chooseSupplier") }, ...(data?.items ?? []).map((supplier) => ({ value: String(supplier.id), label: `${supplier.code} ${supplier.name}` }))];
  const departments = [{ value: "", label: t("purchase:chooseDepartment") }, ...DEPARTMENTS.map((value) => ({ value, label: t(`master:users.departments.${value}`) }))];

  if (!data) return null; // the select of the suppliers starts with its options, so it shows the supplier that is chosen already

  return (
    <>
      <Section icon={ClipboardList} title={t("purchase:form.section")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            label={t("purchase:supplier")}
            options={suppliers}
            error={errors.supplierId?.message}
            {...form.register("supplierId", {
              // the materials differ from a supplier to another: the lines start again
              onChange: () => form.setValue("lines", []),
            })}
          />
          <TextField label={t("purchase:requiredDate")} placeholder={t("examples:date")} inputMode="numeric" error={errors.requiredDate?.message} {...form.register("requiredDate")} />
          <SelectField label={t("purchase:department")} options={departments} error={errors.department?.message} {...form.register("department")} />
          <p className="self-end pb-2 text-sm text-muted-foreground">{t("purchase:form.supplierHint")}</p>
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={notesId} className="text-sm font-semibold">
              {t("purchase:notes")}
            </FieldLabel>
            <Textarea id={notesId} placeholder={t("examples:notes")} {...form.register("notes")} />
          </Field>
        </div>
      </Section>
      <PoLines form={form} />
    </>
  );
}

/** From "Create PO" of a material: the first active supplier that sells it, and the missing quantity, so the form starts ready. */
function usePrefill(isNew) {
  const [params] = useSearchParams();
  const materialId = isNew ? params.get("material") : null;
  const { data, loading } = useLoad(async () => {
    if (!materialId) return null;
    const [material, found] = await Promise.all([materialsApi.get(materialId), suppliersApi.list({ materialId, active: "true", pageSize: 1 })]);
    const supplier = found.items[0] ? await suppliersApi.get(found.items[0].id) : null; // the list has no items: its price needs the supplier itself
    return { material, supplier };
  }, [materialId]);
  return { loading: Boolean(materialId) && loading, prefill: data };
}

export function PurchaseForm({ id }) {
  const { t } = useTranslation("purchase");
  const { user } = useAuth();
  const isNew = !id;
  const { loading, prefill } = usePrefill(isNew);
  if (loading) return null;

  const department = DEPARTMENTS.includes(user?.department) ? user.department : "Factory";
  const defaults = { supplierId: "", requiredDate: todayIso(), department, notes: "", lines: [] };
  if (prefill?.supplier) {
    const item = prefill.supplier.items?.find((entry) => entry.materialId === prefill.material.id);
    const missing = prefill.material.minLevel === null ? "" : Math.max(0, Math.round((prefill.material.minLevel - prefill.material.total) * 1000) / 1000);
    defaults.supplierId = String(prefill.supplier.id);
    defaults.lines = [{ materialId: String(prefill.material.id), quantity: missing || "", unitPrice: item?.unitPrice ?? "" }];
  }

  return (
    <RecordFormPage
      api={purchaseApi}
      listPath="/purchase/orders"
      newTitle={t("new")}
      titleOf={(record) => record.poNumber}
      defaults={defaults}
      afterSave={(saved) => `/purchase/orders/${saved.id}`}
      toForm={(record) => ({
        supplierId: String(record.supplierId),
        requiredDate: record.requiredDate,
        department: record.department,
        notes: record.notes,
        lines: record.lines.map((line) => ({ materialId: String(line.materialId), quantity: line.quantity, unitPrice: line.unitPrice })),
      })}
      toBody={(values) => values}
    >
      {({ form }) => <PoFields form={form} />}
    </RecordFormPage>
  );
}
