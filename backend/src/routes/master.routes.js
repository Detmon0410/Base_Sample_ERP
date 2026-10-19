import { Router } from "express";

import { asyncHandler, created, ok, parseId } from "../lib/util.js";
import { can, requires } from "../lib/permissions.js";
import { crudRouter } from "./crud.js";
import * as customers from "../services/customer.service.js";
import * as products from "../services/product.service.js";
import * as stock from "../services/stock.service.js";
import * as suppliers from "../services/supplier.service.js";
import * as users from "../services/user.service.js";

export const customerRoutes = crudRouter(customers, { read: can.adminOrSales, write: can.admin });
export const productRoutes = crudRouter(products, { read: can.everyone, write: can.admin });
// Suppliers: Admin full, Factory Worker view, Sale Worker none
export const supplierRoutes = crudRouter(suppliers, { read: can.adminOrFactory, write: can.admin });
export const userRoutes = crudRouter(users, { read: can.admin, write: can.admin });

// Materials: the five calls plus their stock changes
export const materialRoutes = Router();
materialRoutes.get("/:id/stock-changes", asyncHandler(async (req, res) => ok(res, await stock.history(parseId(req.params.id)))));
materialRoutes.post(
  "/:id/stock-changes",
  requires(can.adminOrFactory),
  asyncHandler(async (req, res) => created(res, await stock.addStockChange(parseId(req.params.id), req.body ?? {}, req.user)))
);
materialRoutes.use(crudRouter(stock, { read: can.everyone, write: can.admin }));

export const movementRoutes = Router();
movementRoutes.get(
  "/",
  asyncHandler(async (req, res) => {
    const { data, meta } = await stock.movements(req.query);
    ok(res, data, { meta });
  })
);
