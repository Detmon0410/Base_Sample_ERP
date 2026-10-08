import { z } from "zod";

import { REQUIRED } from "../lineSchema";

const QTY = "sale:validation.qty0";

export const deliverySchema = z.object({
  date: z.string().min(1, REQUIRED),
  warehouseId: z.number({ message: REQUIRED }),
  lines: z
    .array(z.object({ productId: z.number(), deliverNow: z.number({ message: QTY }).int(QTY).min(0, QTY), serials: z.array(z.string()) }))
    .refine((lines) => lines.some((line) => line.deliverNow > 0), "sale:validation.deliverSomething"),
});

export const emptyDelivery = () => ({ date: "", warehouseId: null, lines: [] });

export function toFormValues(doc) {
  return {
    date: doc.date ?? "",
    warehouseId: doc.warehouseId ?? null,
    lines: (doc.lines ?? []).map((line) => ({ productId: line.productId, deliverNow: line.deliverNow, serials: line.serials ?? [] })),
  };
}
