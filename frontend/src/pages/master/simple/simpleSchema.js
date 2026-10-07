import { z } from "zod";

// Messages are i18n keys (namespace "master"); they are translated when shown.
const REQUIRED = "master:validation.required";
const TOO_LONG = "master:validation.maxLength";
const NUMBER = "master:validation.numberInvalid";

function fieldSchema(field) {
  if (field.type === "number") return field.required ? z.number({ message: REQUIRED }).int(NUMBER).min(0, NUMBER) : z.number({ message: NUMBER }).int(NUMBER).min(0, NUMBER).nullable();
  if (field.type === "select") {
    return field.required
      ? z.string().refine((value) => field.options.includes(value), REQUIRED)
      : z.string().refine((value) => value === "" || field.options.includes(value), REQUIRED);
  }
  return field.required ? z.string().trim().min(1, REQUIRED).max(field.max ?? 100, TOO_LONG) : z.string().trim().max(field.max ?? 100, TOO_LONG);
}

/** zod schema for an entity of config/simpleMaster.js: code + name + its own fields. */
export function buildSchema(entity) {
  const shape = {
    code: z.string().trim().min(1, REQUIRED).max(20, TOO_LONG),
    name: z.string().trim().min(1, REQUIRED).max(100, TOO_LONG),
  };
  for (const field of entity.fields) shape[field.name] = fieldSchema(field);
  return z.object(shape);
}

const emptyValue = (field) => (field.type === "number" ? null : "");

export function emptyValues(entity) {
  return { code: "", name: "", ...Object.fromEntries(entity.fields.map((field) => [field.name, emptyValue(field)])) };
}

/** API record -> form values (null / missing text becomes ""). */
export function toFormValues(entity, record) {
  return {
    code: record.code ?? "",
    name: record.name ?? "",
    ...Object.fromEntries(entity.fields.map((field) => [field.name, record[field.name] ?? emptyValue(field)])),
  };
}
