import { z } from "zod";

import { PAYMENT_TERMS } from "@/config/masterData";

// Messages are i18n keys (namespace "master"); they are translated when shown.
const REQUIRED = "master:validation.required";
const TOO_LONG = "master:validation.maxLength";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (max) => z.string().trim().max(max, TOO_LONG);

export const supplierSchema = z.object({
  code: z.string().trim().min(1, REQUIRED).max(20, TOO_LONG),
  name: z.string().trim().min(1, REQUIRED).max(100, TOO_LONG),
  taxId: z.string().trim().max(14, TOO_LONG).regex(/^T?\d*$/, "master:validation.taxIdInvalid"),
  address: text(500),
  contactPerson: text(100),
  contactPhone: text(30),
  contactEmail: text(100).refine((value) => value === "" || EMAIL.test(value), "master:validation.emailInvalid"),
  paymentTerms: z.string().refine((value) => value === "" || PAYMENT_TERMS.includes(value), REQUIRED),
});

export const EMPTY_SUPPLIER = {
  code: "",
  name: "",
  taxId: "",
  address: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  paymentTerms: "NET_30",
};

export function toFormValues(supplier) {
  return Object.fromEntries(Object.keys(EMPTY_SUPPLIER).map((key) => [key, supplier[key] ?? ""]));
}

export function toPayload(values) {
  return { ...values, paymentTerms: values.paymentTerms || null };
}
