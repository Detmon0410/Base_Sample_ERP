export function errorMiddleware(error, req, res, next) {
  console.error(error);

  if (error.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "Resource already exists",
      error: "CONFLICT"
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Resource not found",
      error: "NOT_FOUND"
    });
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: "INTERNAL_SERVER_ERROR"
  });
}
