/** Thrown by mock handlers; the adapter turns it into an Axios error with the API error envelope. */
export class MockHttpError extends Error {
  /** `details` (optional) is sent as `errors`, e.g. the field list of a VALIDATION_ERROR. */
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Return this from a handler to control the HTTP status, a list `meta`, or a `message`.
 * Anything else a handler returns is sent as `data` with status 200.
 */
export class MockResponse {
  constructor({ data = null, meta, status = 200, message } = {}) {
    this.data = data;
    this.meta = meta;
    this.status = status;
    this.message = message;
  }
}
