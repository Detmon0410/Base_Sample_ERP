import { useFieldArray } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Route, Routes, useParams } from "react-router";

import { Section, TextField } from "@/components/common/FormFields";
import { RecordFormPage } from "@/components/common/RecordFormPage";
import { RecordList } from "@/components/common/RecordList";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { useAuth } from "@/hooks/useAuth";
import { formatNumber } from "@/utils/format";
import { materialsApi } from "@/services/master.service";
import { isAdmin } from "@/utils/permissions";

import { StockChanges } from "./StockChanges";

const EMPTY = { code: "", name: "", lots: [] };

const total = (lots) => lots.reduce((sum, lot) => sum + Number(lot.quantity || 0), 0);

/** The lots a NEW material starts with (each becomes an "Add" in the stock history). After that the lots change only through stock changes. */
function LotLines({ form, readOnly }) {
  const { t } = useTranslation("master");
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lots" });
  const errors = form.formState.errors.lots;

  return (
    <Section title={t("materials.lots")}>
      {fields.length === 0 ? <p className="mb-3 text-muted-foreground">{t("materials.noLots")}</p> : null}
      <div className="flex flex-col gap-4">
        {fields.map((field, index) => (
          <div key={field.id} className="grid items-start gap-4 sm:grid-cols-[1fr_9rem_auto]">
            <TextField label={t("materials.lotNumber")} disabled={readOnly} error={errors?.[index]?.lotNumber?.message} {...form.register(`lots.${index}.lotNumber`)} />
            <TextField
              label={t("materials.quantity")}
              type="number"
              min="0"
              step="0.001"
              disabled={readOnly}
              error={errors?.[index]?.quantity?.message}
              {...form.register(`lots.${index}.quantity`)}
            />
            {readOnly ? null : (
              <Button type="button" variant="outline" size="sm" className="sm:mt-6" onClick={() => remove(index)}>
                {t("materials.removeLot")}
              </Button>
            )}
          </div>
        ))}
      </div>
      {errors?.message ? <FieldError className="mt-2">{errors.message}</FieldError> : null}
      {readOnly ? null : (
        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => append({ lotNumber: "", quantity: "" })}>
          {t("materials.addLot")}
        </Button>
      )}
    </Section>
  );
}

function MaterialForm() {
  const { t } = useTranslation("master");
  const { user } = useAuth();
  const readOnly = !isAdmin(user);
  return (
    <RecordFormPage
      api={materialsApi}
      listPath="/stock"
      newTitle={t("materials.new")}
      titleOf={(record) => `${record.code} ${record.name}`}
      defaults={EMPTY}
      readOnly={readOnly}
      toForm={(record) => ({ code: record.code, name: record.name, lots: record.lots })}
      toBody={(values) => values}
    >
      {({ form, record }) => {
        const errors = form.formState.errors;
        return (
          <>
            <Section title={t("materials.section")}>
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField label={t("materials.code")} disabled={readOnly} error={errors.code?.message} {...form.register("code")} />
                <TextField label={t("materials.name")} disabled={readOnly} error={errors.name?.message} {...form.register("name")} />
              </div>
            </Section>
            {record ? null : <LotLines form={form} readOnly={readOnly} />}
          </>
        );
      }}
    </RecordFormPage>
  );
}

/** One material: its fields, and (once it exists) its lots, the stock changes (Admin) and the history. */
function MaterialPage() {
  const { id } = useParams();
  const { user } = useAuth();
  return (
    <>
      <MaterialForm />
      {id ? <StockChanges materialId={id} canChange={isAdmin(user)} /> : null}
    </>
  );
}

/** Materials and stock: the materials with their quantity in all lots (the Worker only reads). */
export function StockPage() {
  const { t, i18n } = useTranslation("master");
  const { user } = useAuth();
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={materialsApi}
            base="/stock"
            title={t("materials.title")}
            canCreate={isAdmin(user)}
            newLabel={t("materials.new")}
            columns={[
              { key: "code", header: t("materials.code") },
              { key: "name", header: t("materials.name") },
              { key: "lotCount", header: t("materials.lotCount"), cell: (row) => formatNumber(row.lots.length, i18n.language) },
              { key: "total", header: t("materials.total"), cell: (row) => formatNumber(total(row.lots), i18n.language) },
            ]}
          />
        }
      />
      <Route path="new" element={<MaterialPage />} />
      <Route path=":id" element={<MaterialPage />} />
    </Routes>
  );
}
