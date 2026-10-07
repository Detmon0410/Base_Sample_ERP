import { z } from "zod";

import { todayIso } from "@/utils/dates";

const REQUIRED = "sale:validation.required";

export const moneySchema = z.object({
  docId: z.number({ message: REQUIRED }),
  date: z.string().min(1, REQUIRED),
  amount: z.number({ message: REQUIRED }).int("accounting:validation.priceWhole").gt(0, "accounting:validation.amountPositive"),
  methodId: z.number({ message: REQUIRED }),
  bankAccountId: z.number().nullable(),
  reference: z.string().max(100, "sale:validation.maxLength"),
  remarks: z.string().max(500, "sale:validation.maxLength"),
});

/** A new receipt / payment; `prefill` is what "Receive payment" / "Pay supplier" sends: { docId }. */
export const emptyMoney = (prefill) => ({ docId: prefill?.docId ?? null, date: todayIso(), amount: null, methodId: null, bankAccountId: null, reference: "", remarks: "" });

export const toFormValues = (m) => ({
  docId: m.docId ?? null,
  date: m.date ?? "",
  amount: m.amount ?? null,
  methodId: m.methodId ?? null,
  bankAccountId: m.bankAccountId ?? null,
  reference: m.reference ?? "",
  remarks: m.remarks ?? "",
});
