import { Router } from "express";

import { asyncHandler, created, ok, parseId } from "../lib/util.js";
import { can, requires } from "../lib/permissions.js";
import * as invoices from "../services/invoice.service.js";

export const invoiceRoutes = Router();
invoiceRoutes.use(requires(can.admin));
invoiceRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, meta } = await invoices.list(req.query);
    ok(res, data, { meta });
  })
);
invoiceRoutes.get("/:id", asyncHandler(async (req, res) => ok(res, await invoices.get(parseId(req.params.id)))));
invoiceRoutes.post("/", asyncHandler(async (req, res) => created(res, await invoices.create(req.body ?? {}))));
invoiceRoutes.post("/:id/payment", asyncHandler(async (req, res) => ok(res, await invoices.pay(parseId(req.params.id), req.body ?? {}))));

export const receiptRoutes = Router();
receiptRoutes.use(requires(can.admin));
receiptRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, meta } = await invoices.listReceipts(req.query);
    ok(res, data, { meta });
  })
);
receiptRoutes.get("/:id", asyncHandler(async (req, res) => ok(res, await invoices.getReceipt(parseId(req.params.id)))));
