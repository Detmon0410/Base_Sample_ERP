import { z } from "zod";

import { PAYMENT_TERMS } from "@/config/masterData";

// Messages are i18n keys (namespace "master"); they are translated when shown.
const REQUIRED = "master:validation.required";
const TOO_LONG = "master:validation.maxLength";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (max) => z.string().trim().max(max, TOO_LONG);

export const customerSchema = z.object({
  code: z.string().trim().min(1, REQUIRED).max(20, TOO_LONG),
  name: z.string().trim().min(1, REQUIRED).max(100, TOO_LONG),
  // Digits, with an optional leading T (invoice registration number). No checksum in v1 (F3 Q10).
  taxId: z.string().trim().max(14, TOO_LONG).regex(/^T?\d*$/, "master:validation.taxIdInvalid"),
  address: text(500),
  contactPerson: text(100),
  contactPhone: text(30),
  contactEmail: text(100).refine((value) => value === "" || EMAIL.test(value), "master:validation.emailInvalid"),
  paymentTerms: z.string().refine((value) => value === "" || PAYMENT_TERMS.includes(value), REQUIRED),
  creditLimit: z
    .number({ message: "master:validation.amountInvalid" })
    .int("master:validation.amountInvalid")
    .min(0, "master:validation.amountInvalid")
    .nullable(),
});

export const EMPTY_CUSTOMER = {
  code: "",
  name: "",
  taxId: "",
  address: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  paymentTerms: "NET_30",
  creditLimit: null,
};

/** API record -> form values (null / missing text becomes ""). */
export function toFormValues(customer) {
  return {
    code: customer.code ?? "",
    name: customer.name ?? "",
    taxId: customer.taxId ?? "",
    address: customer.address ?? "",
    contactPerson: customer.contactPerson ?? "",
    contactPhone: customer.contactPhone ?? "",
    contactEmail: customer.contactEmail ?? "",
    paymentTerms: customer.paymentTerms ?? "",
    creditLimit: customer.creditLimit ?? null,
  };
}

/** Form values -> request body (empty optional text is sent as an empty string, no payment terms as null). */
export function toPayload(values) {
  return { ...values, paymentTerms: values.paymentTerms || null };
}
