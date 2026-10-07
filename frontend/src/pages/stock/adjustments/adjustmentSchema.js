import { z } from "zod";

import { todayIso } from "@/utils/dates";

const REQUIRED = "sale:validation.required";

export const adjustmentSchema = z
  .object({
    itemType: z.enum(["material", "product"]),
    itemId: z.number({ message: REQUIRED }),
    warehouseId: z.number({ message: REQUIRED }),
    countedQty: z.number({ message: REQUIRED }).min(0, "stock:validation.qty"),
    reason: z.string().min(1, REQUIRED),
    date: z.string().min(1, REQUIRED),
    remarks: z.string().max(500, "stock:validation.maxLength"),
  })
  .superRefine((values, context) => {
    // pieces are counted whole; a material (kg, m) may have decimals
    if (values.itemType === "product" && Number.isFinite(values.countedQty) && !Number.isInteger(values.countedQty)) {
      context.addIssue({ code: "custom", path: ["countedQty"], message: "stock:validation.wholeQty" });
    }
    if (values.reason === "other" && !values.remarks.trim()) {
      context.addIssue({ code: "custom", path: ["remarks"], message: "stock:validation.noteRequired" });
    }
  });

/** A new adjustment; `prefill` is the state the "New adjustment" button of the item sheet sends. */
export const emptyAdjustment = (prefill) => ({
  itemType: prefill?.itemType === "product" ? "product" : "material",
  itemId: prefill?.itemId ?? null,
  warehouseId: null,
  countedQty: null,
  reason: prefill?.reason ?? "",
  date: todayIso(),
  remarks: "",
});

export const toFormValues = (adjustment) => ({
  itemType: adjustment.itemType ?? "material",
  itemId: adjustment.itemId ?? null,
  warehouseId: adjustment.warehouseId ?? null,
  countedQty: adjustment.countedQty ?? null,
  reason: adjustment.reason ?? "",
  date: adjustment.date ?? "",
  remarks: adjustment.remarks ?? "",
});
