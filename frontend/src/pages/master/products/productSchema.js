import { z } from "zod";

// Messages are i18n keys (namespace "master"); they are translated when shown.
const REQUIRED = "master:validation.required";
const TOO_LONG = "master:validation.maxLength";
const AMOUNT = "master:validation.amountInvalid";

export const productSchema = z.object({
  code: z.string().trim().min(1, REQUIRED).max(20, TOO_LONG),
  name: z.string().trim().min(1, REQUIRED).max(100, TOO_LONG),
  uom: z.string().min(1, REQUIRED),
  sellingPrice: z.number({ message: AMOUNT }).int(AMOUNT).min(0, AMOUNT).nullable(),
  category: z.string().trim().max(50, TOO_LONG),
});

export const EMPTY_PRODUCT = { code: "", name: "", uom: "", sellingPrice: null, category: "" };

export function toFormValues(product) {
  return {
    code: product.code ?? "",
    name: product.name ?? "",
    uom: product.uom ?? "",
    sellingPrice: product.sellingPrice ?? null,
    category: product.category ?? "",
  };
}
