import { z } from "zod";

import { EMPTY_LINE } from "@/config/sale";
import { addDaysIso, todayIso } from "@/utils/dates";

import { checkUniqueProducts, linesField, REQUIRED, toFormLines } from "../lineSchema";

export const quotationSchema = z
  .object({
    customerId: z.number({ message: REQUIRED }),
    date: z.string().min(1, REQUIRED),
    validUntil: z.string().min(1, REQUIRED),
    salesPersonId: z.number().nullable(),
    remarks: z.string().max(500, "sale:validation.maxLength"),
    lines: linesField,
  })
  .superRefine((values, ctx) => {
    if (values.validUntil && values.date && values.validUntil < values.date) {
      ctx.addIssue({ code: "custom", path: ["validUntil"], message: "sale:validation.dateOrder" });
    }
    checkUniqueProducts(values, ctx);
  });

/** A new quotation: today, valid for 30 days (spec Q4), one empty line. */
export const emptyQuotation = () => {
  const date = todayIso();
  return { customerId: null, date, validUntil: addDaysIso(date, 30), salesPersonId: null, remarks: "", lines: [{ ...EMPTY_LINE }] };
};

export function toFormValues(doc) {
  return {
    customerId: doc.customerId ?? null,
    date: doc.date ?? "",
    validUntil: doc.validUntil ?? "",
    salesPersonId: doc.salesPersonId ?? null,
    remarks: doc.remarks ?? "",
    lines: toFormLines(doc.lines),
  };
}
