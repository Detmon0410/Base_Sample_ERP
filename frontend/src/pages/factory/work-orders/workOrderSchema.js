import { z } from "zod";

const REQUIRED = "sale:validation.required";

/**
 * Form of a Work Order. `line` is "<sales order id>:<product id>" while the order is new (the picker of the lines that
 * wait for a Work Order); a saved Work Order keeps its own order and product, only the quantity, the plan dates and the
 * remarks can change (and only while it is a draft).
 */
export const workOrderSchema = z
  .object({
    line: z.string().min(1, REQUIRED),
    qty: z.number({ message: REQUIRED }).int("factory:validation.qtyInvalid").min(1, "factory:validation.qtyInvalid"),
    planStart: z.string(),
    planFinish: z.string(),
    remarks: z.string().max(500, "sale:validation.maxLength"),
  })
  .superRefine((values, context) => {
    if (values.planStart && values.planFinish && values.planFinish < values.planStart) {
      context.addIssue({ code: "custom", path: ["planFinish"], message: "master:validation.dateOrder" });
    }
  });

/** A new Work Order; `prefill` is the state the "Create work order" button of the waiting panel sends. */
export const emptyWorkOrder = (prefill) => ({
  line: prefill?.saleOrderId ? `${prefill.saleOrderId}:${prefill.productId}` : "",
  qty: prefill?.qty ?? null,
  planStart: "",
  planFinish: "",
  remarks: "",
});

export const toFormValues = (wo) => ({
  line: `${wo.saleOrderId}:${wo.productId}`,
  qty: wo.qty ?? null,
  planStart: wo.planStart ?? "",
  planFinish: wo.planFinish ?? "",
  remarks: wo.remarks ?? "",
});

export function toPayload(values) {
  const [saleOrderId, productId] = values.line.split(":").map(Number);
  return { saleOrderId, productId, qty: values.qty, planStart: values.planStart || null, planFinish: values.planFinish || null, remarks: values.remarks };
}
