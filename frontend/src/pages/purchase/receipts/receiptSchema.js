import { z } from "zod";

import { todayIso } from "@/utils/dates";

const REQUIRED = "sale:validation.required";

const lineSchema = z.object({
  materialId: z.number({ message: REQUIRED }),
  delivered: z.number({ message: REQUIRED }).min(0, "purchase:validation.qtyNegative"),
  accepted: z.number({ message: REQUIRED }).min(0, "purchase:validation.qtyNegative"),
  rejectReason: z.string(),
  rejectNote: z.string().max(200, "sale:validation.maxLength"),
  lot: z.string().max(50, "sale:validation.maxLength"),
});

export const receiptSchema = z
  .object({
    poId: z.number({ message: REQUIRED }),
    warehouseId: z.number({ message: REQUIRED }),
    date: z.string().min(1, REQUIRED),
    deliveryNoteNo: z.string().max(50, "sale:validation.maxLength"),
    remarks: z.string().max(500, "sale:validation.maxLength"),
    lines: z.array(lineSchema).min(1, "purchase:validation.receiptLinesRequired"),
  })
  .superRefine((values, context) => {
    let delivered = 0;
    values.lines.forEach((line, index) => {
      delivered += line.delivered;
      if (line.accepted > line.delivered) context.addIssue({ code: "custom", path: ["lines", index, "accepted"], message: "purchase:validation.acceptedTooMany" });
      else if (line.delivered > line.accepted) {
        if (!line.rejectReason) context.addIssue({ code: "custom", path: ["lines", index, "rejectReason"], message: "purchase:validation.reasonRequired" });
        else if (line.rejectReason === "other" && !line.rejectNote.trim()) context.addIssue({ code: "custom", path: ["lines", index, "rejectNote"], message: "purchase:validation.noteRequired" });
      }
    });
    if (values.lines.length > 0 && delivered <= 0) context.addIssue({ code: "custom", path: ["lines"], message: "purchase:validation.nothingDelivered" });
  });

/** A new receipt for a PO: the lines come from the open quantities of the PO once it is chosen. */
export const emptyReceipt = (prefill) => ({ poId: prefill?.poId ?? null, warehouseId: null, date: todayIso(), deliveryNoteNo: "", remarks: "", lines: [] });

/** One receipt line from one open PO line: everything that is open arrives and is accepted until the user lowers it. */
export const lineFromPo = (poLine) => ({ materialId: poLine.materialId, delivered: poLine.open, accepted: poLine.open, rejectReason: "", rejectNote: "", lot: "" });

export const toFormValues = (receipt) => ({
  poId: receipt.poId ?? null,
  warehouseId: receipt.warehouseId ?? null,
  date: receipt.date ?? "",
  deliveryNoteNo: receipt.deliveryNoteNo ?? "",
  remarks: receipt.remarks ?? "",
  lines: (receipt.lines ?? []).map((line) => ({ materialId: line.materialId, delivered: line.delivered, accepted: line.accepted, rejectReason: line.rejectReason ?? "", rejectNote: line.rejectNote ?? "", lot: line.lot ?? "" })),
});
