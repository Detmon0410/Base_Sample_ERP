import { CogIcon, RulerIcon, UserRoundIcon, WarehouseIcon } from "lucide-react";
import { useMemo } from "react";
import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

import { FormField } from "@/components/common/FormField";
import { FormSection } from "@/components/common/FormSection";
import { RecordInfoCard } from "@/components/common/RecordInfoCard";
import { RecordSheet, SheetFormBody } from "@/components/common/RecordSheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecordForm } from "@/hooks/useRecordForm";
import { simpleMasterServices } from "@/services/simpleMaster.service";

import { buildSchema, emptyValues, toFormValues } from "./simpleSchema";

const ICONS = { uom: RulerIcon, warehouses: WarehouseIcon, machines: CogIcon, employees: UserRoundIcon };

/** Create / edit form of a flat master data entity (config/simpleMaster.js). */
export function SimpleFormPage({ entity }) {
  const { t } = useTranslation(["master", "nav"]);
  const schema = useMemo(() => buildSchema(entity), [entity]);
  const toValues = useMemo(() => (record) => toFormValues(entity, record), [entity]);
  const page = useRecordForm({
    service: simpleMasterServices[entity.key],
    schema,
    emptyValues: emptyValues(entity),
    toValues,
    listPath: entity.path,
    idPrefix: entity.key,
  });
  const { isNew, record, form, errors, message, fieldProps } = page;
  const prefix = entity.key;

  const renderField = (field) => {
    const id = `${prefix}-${field.name}`;
    const label = t(`master:${entity.key}.form.fields.${field.name}`);
    const placeholder = t(`master:${entity.key}.form.placeholders.${field.name}`, { defaultValue: "" });

    if (field.type === "select") {
      return (
        <FormField key={field.name} id={id} label={label} required={field.required} error={message(errors[field.name])}>
          <Controller
            control={form.control}
            name={field.name}
            render={({ field: controlled }) => (
              <Select value={controlled.value} onValueChange={controlled.onChange}>
                <SelectTrigger id={id} className="w-full" {...fieldProps(field.name)}>
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {t(`master:${entity.key}.options.${field.name}.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      );
    }

    const isNumber = field.type === "number";
    return (
      <FormField key={field.name} id={id} label={label} required={field.required} error={message(errors[field.name])}>
        <Input
          id={id}
          type={isNumber ? "number" : "text"}
          inputMode={isNumber ? "numeric" : undefined}
          min={isNumber ? 0 : undefined}
          placeholder={placeholder || undefined}
          {...fieldProps(field.name)}
          {...form.register(field.name, isNumber ? { setValueAs: (value) => (value === "" || value == null ? null : Number(value)) } : undefined)}
        />
      </FormField>
    );
  };

  return (
    <RecordSheet
      page={page}
      entityTitle={t(`nav:${entity.nav}`)}
      newTitle={t(`master:${entity.key}.new`)}
      editTitle={t(`master:${entity.key}.edit`)}
      singular={t(`master:${entity.key}.singular`)}
      formId={`${prefix}-form`}
    >
      <form id={`${prefix}-form`} noValidate onSubmit={page.onSubmit} className="flex min-h-0 flex-1 flex-col">
        <SheetFormBody>
          <FormSection title={t(`master:${entity.key}.form.section`)} icon={ICONS[entity.key]}>
            <FormField
              id={`${prefix}-code`}
              label={t("master:common.code")}
              required
              error={message(errors.code)}
              hint={isNew ? undefined : t("master:common.codeFixed")}
            >
              <Input
                id={`${prefix}-code`}
                autoFocus={isNew}
                readOnly={!isNew}
                placeholder={t(`master:${entity.key}.form.placeholders.code`)}
                className={isNew ? undefined : "bg-muted"}
                {...fieldProps("code", !isNew)}
                {...form.register("code")}
              />
            </FormField>
            <FormField id={`${prefix}-name`} label={t("master:common.name")} required error={message(errors.name)}>
              <Input id={`${prefix}-name`} {...fieldProps("name")} {...form.register("name")} />
            </FormField>
            {entity.fields.map(renderField)}
          </FormSection>

          {!isNew ? <RecordInfoCard record={record} /> : null}
        </SheetFormBody>
      </form>
    </RecordSheet>
  );
}
