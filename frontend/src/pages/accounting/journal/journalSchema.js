import { z } from "zod";

import { todayIso } from "@/utils/dates";

const REQUIRED = "sale:validation.required";

const lineSchema = z.object({
  accountId: z.number({ message: REQUIRED }),
  debit: z.number().int("accounting:validation.priceWhole").min(0, "accounting:validation.priceNegative"),
  credit: z.number().int("accounting:validation.priceWhole").min(0, "accounting:validation.priceNegative"),
  memo: z.string().max(100, "sale:validation.maxLength"),
});

export const journalSchema = z
  .object({
    date: z.string().min(1, REQUIRED),
    memo: z.string().trim().min(1, REQUIRED).max(200, "sale:validation.maxLength"),
    reference: z.string().max(100, "sale:validation.maxLength"),
    lines: z.array(lineSchema).min(2, "accounting:validation.twoLines"),
  })
  .superRefine((values, context) => {
    values.lines.forEach((line, index) => {
      if (line.debit > 0 && line.credit > 0) context.addIssue({ code: "custom", path: ["lines", index, "debit"], message: "accounting:validation.oneSide" });
      else if (line.debit === 0 && line.credit === 0) context.addIssue({ code: "custom", path: ["lines", index, "debit"], message: "accounting:validation.oneSide" });
    });
  });

export const EMPTY_ENTRY_LINE = { accountId: null, debit: 0, credit: 0, memo: "" };
export const emptyEntry = () => ({ date: todayIso(), memo: "", reference: "", lines: [{ ...EMPTY_ENTRY_LINE }, { ...EMPTY_ENTRY_LINE }] });
export const toFormValues = (entry) => ({
  date: entry.date ?? "",
  memo: entry.memo ?? "",
  reference: entry.reference ?? "",
  lines: (entry.lines ?? []).map((line) => ({ accountId: line.accountId, debit: line.debit, credit: line.credit, memo: line.memo ?? "" })),
});
