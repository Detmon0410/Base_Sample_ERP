import { Router } from "express";

import { asyncHandler, created, ok, parseId } from "../lib/util.js";
import { can, requires } from "../lib/permissions.js";
import * as purchase from "../services/purchase.service.js";

// Purchase: Admin and Factory Worker. A Sale Worker answers 403 before any lookup.
export const purchaseRoutes = Router();
purchaseRoutes.use(requires(can.adminOrFactory));
purchaseRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, meta } = await purchase.list(req.query);
    ok(res, data, { meta });
  })
);
purchaseRoutes.get("/:id", asyncHandler(async (req, res) => ok(res, await purchase.get(parseId(req.params.id)))));
purchaseRoutes.post("/", asyncHandler(async (req, res) => created(res, await purchase.create(req.body ?? {}, req.user))));
purchaseRoutes.put("/:id", asyncHandler(async (req, res) => ok(res, await purchase.update(parseId(req.params.id), req.body ?? {}, req.user))));
purchaseRoutes.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await purchase.remove(parseId(req.params.id));
    ok(res, null);
  })
);
purchaseRoutes.post("/:id/status", asyncHandler(async (req, res) => ok(res, await purchase.changeStatus(parseId(req.params.id), req.body ?? {}, req.user))));
purchaseRoutes.post("/:id/payment", asyncHandler(async (req, res) => ok(res, await purchase.pay(parseId(req.params.id), req.body ?? {}))));
