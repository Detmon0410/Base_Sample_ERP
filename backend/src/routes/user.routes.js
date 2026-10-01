import { Router } from "express";

import * as userController from "../controllers/user.controller.js";
import { validate } from "../middlewares/validate.middleware.js";
import { createUserSchema, updateUserSchema } from "../validators/user.validator.js";

const router = Router();

router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.post("/", validate(createUserSchema), userController.createUser);
router.put("/:id", validate(updateUserSchema), userController.updateUser);
router.delete("/:id", userController.deleteUser);

export default router;
