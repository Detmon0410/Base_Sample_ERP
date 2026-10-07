import { z } from "zod";

import { todayIso } from "@/utils/dates";

const REQUIRED = "sale:validation.required";

const lineSchema = z.object({
  materialId: z.number({ message: REQUIRED }),
  qty: z.number({ message: REQUIRED }).gt(0, "purchase:validation.qtyPositive"),
  unitPrice: z.number({ message: REQUIRED }).int("purchase:validation.priceWhole").min(0, "purchase:validation.priceNegative"),
  priceEdited: z.boolean().optional(),
});

export const purchaseOrderSchema = z
  .object({
    supplierId: z.number({ message: REQUIRED }),
    warehouseId: z.number({ message: REQUIRED }),
    date: z.string().min(1, REQUIRED),
    expectedDate: z.string(),
    remarks: z.string().max(500, "sale:validation.maxLength"),
    lines: z.array(lineSchema).min(1, "purchase:validation.linesRequired"),
  })
  .superRefine((values, context) => {
    if (values.expectedDate && values.date && values.expectedDate < values.date) {
      context.addIssue({ code: "custom", path: ["expectedDate"], message: "sale:validation.dateOrder" });
    }
    const seen = new Set();
    values.lines.forEach((line, index) => {
      if (seen.has(line.materialId)) context.addIssue({ code: "custom", path: ["lines", index, "materialId"], message: "sale:validation.duplicate" });
      seen.add(line.materialId);
    });
  });

/** A new PO; `prefill` is what the stock status board sends: { supplierId, lines: [{ materialId, qty, unitPrice }] }. */
export const emptyPurchaseOrder = (prefill) => ({
  supplierId: prefill?.supplierId ?? null,
  warehouseId: null,
  date: todayIso(),
  expectedDate: "",
  remarks: "",
  lines: prefill?.lines?.length ? prefill.lines.map((line) => ({ materialId: line.materialId, qty: line.qty ?? null, unitPrice: line.unitPrice ?? null, priceEdited: false })) : [{ materialId: null, qty: null, unitPrice: null, priceEdited: false }],
});

export const toFormValues = (po) => ({
  supplierId: po.supplierId ?? null,
  warehouseId: po.warehouseId ?? null,
  date: po.date ?? "",
  expectedDate: po.expectedDate ?? "",
  remarks: po.remarks ?? "",
  lines: (po.lines ?? []).map((line) => ({ materialId: line.materialId, qty: line.qty, unitPrice: line.unitPrice, priceEdited: line.listPrice != null && line.listPrice !== line.unitPrice })),
});

/** The body the server wants: no expected date when it is empty, and no editing flags. */
export const toPayload = (values) => ({
  ...values,
  expectedDate: values.expectedDate || null,
  lines: values.lines.map(({ materialId, qty, unitPrice }) => ({ materialId, qty, unitPrice })),
});
