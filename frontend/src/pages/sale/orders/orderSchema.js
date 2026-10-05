import { z } from "zod";

import { EMPTY_LINE } from "@/config/sale";
import { todayIso } from "@/utils/dates";

import { checkUniqueProducts, linesField, REQUIRED, toFormLines } from "../lineSchema";

export const orderSchema = z
  .object({
    customerId: z.number({ message: REQUIRED }),
    date: z.string().min(1, REQUIRED),
    deliveryDate: z.string(),
    salesPersonId: z.number().nullable(),
    quotationId: z.number().nullable(),
    customerPoId: z.number().nullable(),
    remarks: z.string().max(500, "sale:validation.maxLength"),
    lines: linesField,
  })
  .superRefine((values, ctx) => {
    if (values.deliveryDate && values.date && values.deliveryDate < values.date) {
      ctx.addIssue({ code: "custom", path: ["deliveryDate"], message: "sale:validation.dateOrder" });
    }
    checkUniqueProducts(values, ctx);
  });

export const emptyOrder = () => ({
  customerId: null,
  date: todayIso(),
  deliveryDate: "",
  salesPersonId: null,
  quotationId: null,
  customerPoId: null,
  remarks: "",
  lines: [{ ...EMPTY_LINE }],
});

export function toFormValues(doc) {
  return {
    customerId: doc.customerId ?? null,
    date: doc.date ?? "",
    deliveryDate: doc.deliveryDate ?? "",
    salesPersonId: doc.salesPersonId ?? null,
    quotationId: doc.quotationId ?? null,
    customerPoId: doc.customerPoId ?? null,
    remarks: doc.remarks ?? "",
    lines: toFormLines(doc.lines),
  };
}

/** Form values -> request body (no delivery date is sent as null). */
export const toPayload = (values) => ({ ...values, deliveryDate: values.deliveryDate || null });
