import { Router } from "express";

import { asyncHandler, ok } from "../lib/util.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import * as auth from "../services/auth.service.js";
import { userView } from "../services/user.service.js";

const router = Router();

router.post("/login", asyncHandler(async (req, res) => ok(res, await auth.login(req.body ?? {}, req.ip))));
router.get("/me", authenticate, (req, res) => ok(res, userView(req.user)));
router.post("/logout", authenticate, (req, res) => ok(res, null));

export default router;
