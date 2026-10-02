/** Thrown by mock handlers; the adapter turns it into an Axios error with the API error envelope. */
export class MockHttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
