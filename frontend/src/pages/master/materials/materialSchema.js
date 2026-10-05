import { z } from "zod";

// Messages are i18n keys (namespace "master"); they are translated when shown.
const REQUIRED = "master:validation.required";
const TOO_LONG = "master:validation.maxLength";
const QTY = "master:validation.quantityInvalid";
const POSITIVE = "master:validation.quantityPositive";

export const materialSchema = z.object({
  code: z.string().trim().min(1, REQUIRED).max(20, TOO_LONG),
  name: z.string().trim().min(1, REQUIRED).max(100, TOO_LONG),
  uom: z.string().min(1, REQUIRED),
  reorderPoint: z.number({ message: REQUIRED }).min(0, QTY),
  reorderQty: z.number({ message: POSITIVE }).gt(0, POSITIVE).nullable(),
});

export const EMPTY_MATERIAL = { code: "", name: "", uom: "", reorderPoint: null, reorderQty: null };

export function toFormValues(material) {
  return {
    code: material.code ?? "",
    name: material.name ?? "",
    uom: material.uom ?? "",
    reorderPoint: material.reorderPoint ?? null,
    reorderQty: material.reorderQty ?? null,
  };
}
