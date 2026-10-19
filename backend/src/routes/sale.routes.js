import { Router } from "express";

import { asyncHandler, created, ok, parseId } from "../lib/util.js";
import { can, requires } from "../lib/permissions.js";
import * as qt from "../services/qt.service.js";
import * as orders from "../services/order.service.js";
import * as attachments from "../services/attachment.service.js";
import * as dashboard from "../services/dashboard.service.js";

export const qtRoutes = Router();
qtRoutes.use(requires(can.adminOrSales));
qtRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, meta } = await qt.list(req.query);
    ok(res, data, { meta });
  })
);
qtRoutes.get("/:id", asyncHandler(async (req, res) => ok(res, await qt.get(parseId(req.params.id)))));
qtRoutes.post("/", asyncHandler(async (req, res) => created(res, await qt.create(req.body ?? {}))));
qtRoutes.put("/:id", asyncHandler(async (req, res) => ok(res, await qt.update(parseId(req.params.id), req.body ?? {}))));
qtRoutes.post("/:id/confirm", asyncHandler(async (req, res) => ok(res, await qt.confirm(parseId(req.params.id)))));
qtRoutes.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await qt.remove(parseId(req.params.id));
    ok(res, null);
  })
);

export const orderRoutes = Router();
orderRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, meta } = await orders.list(req.query);
    ok(res, data, { meta });
  })
);
orderRoutes.get("/:id", asyncHandler(async (req, res) => ok(res, await orders.get(parseId(req.params.id)))));
orderRoutes.put(
  "/:id",
  requires(can.adminOrSales),
  asyncHandler(async (req, res) => ok(res, await orders.update(parseId(req.params.id), req.body ?? {})))
);
orderRoutes.post(
  "/:id/start",
  requires(can.adminOrFactory),
  asyncHandler(async (req, res) => ok(res, await orders.start(parseId(req.params.id), req.user)))
);
orderRoutes.post(
  "/:id/progress",
  requires(can.adminOrFactory),
  asyncHandler(async (req, res) => ok(res, await orders.addProgress(parseId(req.params.id), req.body ?? {}, req.user)))
);

// The permission of a file depends on its owner, so the service checks it
export const attachmentRoutes = Router();
attachmentRoutes.get("/", asyncHandler(async (req, res) => ok(res, await attachments.list(req.query, req.user))));
attachmentRoutes.get("/:id", asyncHandler(async (req, res) => ok(res, await attachments.get(parseId(req.params.id), req.user))));
attachmentRoutes.post("/", asyncHandler(async (req, res) => created(res, await attachments.create(req.body ?? {}, req.user))));
attachmentRoutes.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await attachments.remove(parseId(req.params.id), req.user);
    ok(res, null);
  })
);

export const dashboardRoutes = Router();
dashboardRoutes.get("/", asyncHandler(async (req, res) => ok(res, await dashboard.get(req.user))));
