import { z } from "zod";

import { todayIso } from "@/utils/dates";

const REQUIRED = "sale:validation.required";

export const transferSchema = z.object({
  workOrderId: z.number({ message: REQUIRED }),
  qty: z.number({ message: REQUIRED }).int("factory:validation.qtyInvalid").min(1, "factory:validation.qtyInvalid"),
  date: z.string().min(1, REQUIRED),
  warehouseId: z.number({ message: REQUIRED }),
  remarks: z.string().max(500, "sale:validation.maxLength"),
});

/** A new transfer; `prefill` is the state the "Create transfer" button of a Work Order sends. */
export const emptyTransfer = (prefill) => ({ workOrderId: prefill?.workOrderId ?? null, qty: null, date: todayIso(), warehouseId: null, remarks: "" });

export const toFormValues = (transfer) => ({
  workOrderId: transfer.workOrderId ?? null,
  qty: transfer.qty ?? null,
  date: transfer.date ?? "",
  warehouseId: transfer.warehouseId ?? null,
  remarks: transfer.remarks ?? "",
});
