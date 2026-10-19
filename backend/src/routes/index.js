import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware.js";
import authRoutes from "./auth.routes.js";
import { customerRoutes, materialRoutes, movementRoutes, productRoutes, supplierRoutes, userRoutes } from "./master.routes.js";
import { attachmentRoutes, dashboardRoutes, orderRoutes, qtRoutes } from "./sale.routes.js";
import { purchaseRoutes } from "./purchase.routes.js";
import { invoiceRoutes, receiptRoutes } from "./accounting.routes.js";

const router = Router();

router.get("/health", (req, res) => res.json({ success: true, data: { status: "ok" } }));
router.use("/auth", authRoutes);

// Everything below needs a valid token
router.use(authenticate);
router.use("/dashboard", dashboardRoutes);
router.use("/customers", customerRoutes);
router.use("/products", productRoutes);
router.use("/materials", materialRoutes);
router.use("/stock-changes", movementRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/purchase-orders", purchaseRoutes);
router.use("/users", userRoutes);
router.use("/qt", qtRoutes);
router.use("/orders", orderRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/receipts", receiptRoutes);
router.use("/attachments", attachmentRoutes);

export default router;
