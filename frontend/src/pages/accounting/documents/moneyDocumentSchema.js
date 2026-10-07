import { z } from "zod";

import { todayIso } from "@/utils/dates";

const REQUIRED = "sale:validation.required";

const lineSchema = z.object({
  itemId: z.number({ message: REQUIRED }),
  qty: z.number({ message: REQUIRED }).gt(0, "accounting:validation.qtyPositive"),
  maxQty: z.number(),
  unitPrice: z.number({ message: REQUIRED }).int("accounting:validation.priceWhole").min(0, "accounting:validation.priceNegative"),
});

export const moneyDocumentSchema = z
  .object({
    sourceId: z.number({ message: REQUIRED }),
    date: z.string().min(1, REQUIRED),
    dueDate: z.string(),
    taxRateId: z.number({ message: REQUIRED }),
    remarks: z.string().max(500, "sale:validation.maxLength"),
    supplierInvoiceNo: z.string().max(50, "sale:validation.maxLength"),
    lines: z.array(lineSchema).min(1, "accounting:validation.sourceRequired"),
  })
  .superRefine((values, context) => {
    if (values.dueDate && values.date && values.dueDate < values.date) context.addIssue({ code: "custom", path: ["dueDate"], message: "sale:validation.dateOrder" });
    values.lines.forEach((line, index) => {
      if (line.qty > line.maxQty) context.addIssue({ code: "custom", path: ["lines", index, "qty"], message: "accounting:validation.qtyTooMany" });
    });
  });

/** A new invoice / bill; `prefill` is what the "Create invoice" link of a delivery note could send: { sourceId }. */
export const emptyMoneyDocument = (prefill) => ({ sourceId: prefill?.sourceId ?? null, date: todayIso(), dueDate: "", taxRateId: null, remarks: "", supplierInvoiceNo: "", lines: [] });

export const lineFromSource = (line) => ({ itemId: line.itemId, qty: line.qty, maxQty: line.maxQty, unitPrice: line.unitPrice });

export const toFormValues = (doc) => ({
  sourceId: doc.deliveryId ?? doc.receiptId ?? null,
  date: doc.date ?? "",
  dueDate: doc.dueDate ?? "",
  taxRateId: doc.taxRateId ?? null,
  remarks: doc.remarks ?? "",
  supplierInvoiceNo: doc.supplierInvoiceNo ?? "",
  lines: (doc.lines ?? []).map((line) => ({ itemId: line.itemId, qty: line.qty, maxQty: line.maxQty, unitPrice: line.unitPrice })),
});

/** The body the server wants: the lines without the helper maxQty. */
export const toPayload = (values) => ({ ...values, lines: values.lines.map(({ itemId, qty, unitPrice }) => ({ itemId, qty, unitPrice })) });
