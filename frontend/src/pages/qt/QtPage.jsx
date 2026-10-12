import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Route, Routes } from "react-router";

import { Section, SelectField, TextField } from "@/components/common/FormFields";
import { RecordFormPage } from "@/components/common/RecordFormPage";
import { RecordList } from "@/components/common/RecordList";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { useLoad } from "@/hooks/useLoad";
import { customersApi } from "@/services/master.service";
import { qtApi } from "@/services/qt.service";
import { todayIso } from "@/utils/dates";

const empty = () => ({ qtNumber: "", qtDate: todayIso(), customerId: "", notes: "", file: null });

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** The file of the quotation, optional: choose a PDF, PNG or JPG (up to 10 MB; the check is made on Save). An attached file can be removed. */
function FileField({ form }) {
  const { t } = useTranslation("master");
  const id = useId();
  const file = form.watch("file");
  const error = form.formState.errors.file?.message;
  return (
    <Field data-invalid={error ? true : undefined} className="sm:col-span-2">
      <FieldLabel htmlFor={id} className="text-sm font-semibold">
        {t("qt.file")}
      </FieldLabel>
      <input
        key={file ? "chosen" : "none"} // a new input after the file is removed, so the same file can be chosen again
        id={id}
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className="text-base"
        onChange={async (event) => {
          const chosen = event.target.files?.[0];
          if (chosen) form.setValue("file", await readFile(chosen), { shouldDirty: true });
        }}
      />
      {file ? (
        <p className="text-sm">
          {t("qt.attached")}: {file.dataUrl ? <a href={file.dataUrl} download={file.name}>{file.name}</a> : file.name}{" "}
          <button type="button" className="text-link underline" onClick={() => form.setValue("file", null, { shouldDirty: true })}>
            {t("qt.removeFile")}
          </button>
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">{t("qt.fileHint")}</p>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </Field>
  );
}

function QtForm() {
  const { t } = useTranslation("master");
  const { data } = useLoad(() => customersApi.list({ pageSize: 200 }), []);
  const customers = [{ value: "", label: t("qt.chooseCustomer") }, ...(data?.items ?? []).map((customer) => ({ value: String(customer.id), label: customer.name }))];
  const notesId = useId();

  return (
    <RecordFormPage
      api={qtApi}
      listPath="/qt"
      newTitle={t("qt.new")}
      titleOf={(record) => record.qtNumber}
      defaults={empty()}
      toForm={(record) => ({ qtNumber: record.qtNumber, qtDate: record.qtDate, customerId: String(record.customerId), notes: record.notes, file: record.file })}
      toBody={(values) => values}
    >
      {({ form }) => {
        const errors = form.formState.errors;
        return (
          <Section title={t("qt.section")}>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField label={t("qt.qtNumber")} error={errors.qtNumber?.message} {...form.register("qtNumber")} />
              <TextField label={t("qt.qtDate")} placeholder="YYYY-MM-DD" inputMode="numeric" error={errors.qtDate?.message} {...form.register("qtDate")} />
              <SelectField label={t("qt.customer")} options={customers} error={errors.customerId?.message} className="sm:col-span-2" {...form.register("customerId")} />
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor={notesId} className="text-sm font-semibold">
                  {t("qt.notes")}
                </FieldLabel>
                <Textarea id={notesId} {...form.register("notes")} />
              </Field>
              <FileField form={form} />
            </div>
          </Section>
        );
      }}
    </RecordFormPage>
  );
}

/** QT references (Admin): the list, a new reference, one reference with its file. */
export function QtPage() {
  const { t } = useTranslation("master");
  return (
    <Routes>
      <Route
        index
        element={
          <RecordList
            api={qtApi}
            base="/qt"
            title={t("qt.title")}
            canCreate
            newLabel={t("qt.new")}
            columns={[
              { key: "qtNumber", header: t("qt.qtNumber") },
              { key: "qtDate", header: t("qt.qtDate") },
              { key: "customerName", header: t("qt.customer") },
              { key: "file", header: t("qt.fileColumn"), cell: (row) => row.file?.name },
            ]}
          />
        }
      />
      <Route path="new" element={<QtForm />} />
      <Route path=":id" element={<QtForm />} />
    </Routes>
  );
}
