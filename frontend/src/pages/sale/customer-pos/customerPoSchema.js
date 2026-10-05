import { z } from "zod";

import { todayIso } from "@/utils/dates";

import { REQUIRED } from "../lineSchema";

export const customerPoSchema = z.object({
  poNumber: z.string().trim().min(1, REQUIRED).max(50, "sale:validation.maxLength"),
  poDate: z.string().min(1, REQUIRED),
  customerId: z.number({ message: REQUIRED }),
  quotationId: z.number().nullable(),
  note: z.string().max(500, "sale:validation.maxLength"),
  attachment: z.object({ name: z.string(), size: z.number() }).nullable(),
});

export const emptyCustomerPo = () => ({ poNumber: "", poDate: todayIso(), customerId: null, quotationId: null, note: "", attachment: null });

export function toFormValues(po) {
  return {
    poNumber: po.poNumber ?? "",
    poDate: po.poDate ?? "",
    customerId: po.customerId ?? null,
    quotationId: po.quotationId ?? null,
    note: po.note ?? "",
    attachment: po.attachment ?? null,
  };
}
