import { z } from "zod";

// Messages are i18n keys (namespace "sale"); they are translated when shown.
export const REQUIRED = "sale:validation.required";
const QTY = "sale:validation.qty";
const PRICE = "sale:validation.price";

export const lineSchema = z.object({
  productId: z.number({ message: REQUIRED }),
  qty: z.number({ message: QTY }).int(QTY).min(1, QTY),
  unitPrice: z.number({ message: PRICE }).int(PRICE).min(0, PRICE),
  priceEdited: z.boolean(),
});

/** A product may appear once per document. */
export function checkUniqueProducts(values, ctx) {
  const seen = new Set();
  (values.lines ?? []).forEach((line, index) => {
    if (line.productId == null) return;
    if (seen.has(line.productId)) ctx.addIssue({ code: "custom", path: ["lines", index, "productId"], message: "sale:validation.duplicate" });
    seen.add(line.productId);
  });
}

export const linesField = z.array(lineSchema).min(1, "sale:validation.linesRequired");

export const toFormLines = (lines) =>
  (lines ?? []).map((line) => ({ productId: line.productId, qty: line.qty, unitPrice: line.unitPrice, priceEdited: Boolean(line.priceEdited) }));
