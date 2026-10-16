// An error that the API answers with the envelope of docs/api/README.md.
export class ApiError extends Error {
  constructor(status, error, message, errors) {
    super(message || error);
    this.status = status;
    this.error = error;
    this.errors = errors;
  }
}

export const badRequest = (errors, message = "Validation failed") => new ApiError(400, "VALIDATION_ERROR", message, errors);
export const unauthorized = (message = "Unauthorized") => new ApiError(401, "UNAUTHORIZED", message);
export const forbidden = (message = "Forbidden") => new ApiError(403, "FORBIDDEN", message);
export const notFound = (message = "Not found") => new ApiError(404, "NOT_FOUND", message);
export const conflict = (error, message, errors) => new ApiError(409, error, message || error, errors);

// Collects field problems: [{ path: ["bom", "0", "quantity"], code: "INVALID" }]
export class Issues {
  constructor() {
    this.list = [];
  }
  add(path, code) {
    this.list.push({ path: [].concat(path).map(String), code });
  }
  get any() {
    return this.list.length > 0;
  }
  throwIfAny() {
    if (this.any) throw badRequest(this.list);
  }
}
