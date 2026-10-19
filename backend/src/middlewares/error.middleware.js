import { ApiError } from "../lib/errors.js";

export function errorMiddleware(error, req, res, next) {
  if (error instanceof ApiError) {
    const body = { success: false, message: error.message, error: error.error };
    if (error.errors) body.errors = error.errors;
    return res.status(error.status).json(body);
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON", error: "VALIDATION_ERROR" });
  }

  if (error.type === "entity.too.large") {
    return res.status(400).json({
      success: false,
      message: "File too big",
      error: "VALIDATION_ERROR",
      errors: [{ path: ["file"], code: "FILE_TOO_BIG" }]
    });
  }

  if (error.code === "P2002") {
    return res.status(409).json({ success: false, message: "Duplicate value", error: "DUPLICATE_VALUE" });
  }

  if (error.code === "P2025") {
    return res.status(404).json({ success: false, message: "Resource not found", error: "NOT_FOUND" });
  }

  console.error(error);
  res.status(500).json({ success: false, message: "Internal server error", error: "INTERNAL_SERVER_ERROR" });
}
