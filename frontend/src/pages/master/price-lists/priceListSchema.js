import { z } from "zod";

// Messages are i18n keys (namespace "master"); they are translated when shown.
const REQUIRED = "master:validation.required";
const AMOUNT = "master:validation.amountInvalid";
const DATE = "master:validation.dateInvalid";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, DATE);

export const priceListSchema = z
  .object({
    productId: z.number({ message: REQUIRED }),
    customerId: z.number({ message: REQUIRED }),
    price: z.number({ message: AMOUNT }).int(AMOUNT).min(0, AMOUNT),
    validFrom: z.string().min(1, REQUIRED).pipe(isoDate),
    validTo: z.string().refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), DATE),
  })
  .refine((values) => values.validTo === "" || values.validTo >= values.validFrom, {
    path: ["validTo"],
    message: "master:validation.dateOrder",
  });

export const EMPTY_PRICE = { productId: null, customerId: null, price: null, validFrom: "", validTo: "" };

export function toFormValues(row) {
  return {
    productId: row.productId ?? null,
    customerId: row.customerId ?? null,
    price: row.price ?? null,
    validFrom: row.validFrom ?? "",
    validTo: row.validTo ?? "",
  };
}

/** Form values -> request body (no end date is sent as null). */
export function toPayload(values) {
  return { ...values, validTo: values.validTo || null };
}
