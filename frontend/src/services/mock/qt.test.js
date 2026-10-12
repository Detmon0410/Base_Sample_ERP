import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";

const admin = mockUsers[0];
const worker = mockUsers[1];
const call = (route, who, { body = {}, params = {}, query = {} } = {}) => mockRoutes[route]({ body, authorization: `Bearer ${tokenOf(who)}`, params, query });
const fails = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("it should have failed");
};

const PDF = { name: "qt-001.pdf", dataUrl: "data:application/pdf;base64,JVBERi0xLjQ=" };

describe("QT references of the mock", () => {
  const customer = call("POST /customers", admin, { body: { name: "QT Customer" } }).data;
  const body = (extra = {}) => ({ qtNumber: "QT-001", qtDate: "2026-10-01", customerId: customer.id, notes: "first", file: PDF, ...extra });

  it("saves a reference with its file, lists it without the file data, and opens it with the file", () => {
    const made = call("POST /qt", admin, { body: body() }).data;
    expect(made).toMatchObject({ qtNumber: "QT-001", customerName: "QT Customer" });
    expect(made.status).toBeUndefined();
    expect(mockRoutes["PATCH /qt/:id/status"]).toBeUndefined();

    const row = call("GET /qt", admin, { query: { q: "qt customer" } }).data[0];
    expect(row.file).toEqual({ name: "qt-001.pdf", type: "application/pdf" });

    expect(call("GET /qt/:id", admin, { params: { id: made.id } }).file.dataUrl).toBe(PDF.dataUrl);
  });

  it("keeps the QT number unique and checks the date, the customer and the file", () => {
    expect(fails(() => call("POST /qt", admin, { body: body({ qtNumber: "qt-001" }) })).status).toBe(409);
    expect(fails(() => call("POST /qt", admin, { body: body({ qtNumber: "QT-2", qtDate: "2026-02-30" }) })).details).toEqual([{ path: ["qtDate"], code: "INVALID_DATE" }]);
    expect(fails(() => call("POST /qt", admin, { body: body({ qtNumber: "QT-3", customerId: 999 }) })).details).toEqual([{ path: ["customerId"], code: "REQUIRED" }]);
    expect(fails(() => call("POST /qt", admin, { body: body({ qtNumber: "QT-4", file: null }) })).details).toEqual([{ path: ["file"], code: "REQUIRED" }]);
    expect(fails(() => call("POST /qt", admin, { body: body({ qtNumber: "QT-5", file: { name: "a.exe", dataUrl: "data:application/octet-stream;base64,AA==" } }) })).details).toEqual([{ path: ["file"], code: "FILE_TYPE" }]);
    const big = `data:image/png;base64,${"A".repeat(14 * 1024 * 1024)}`;
    expect(fails(() => call("POST /qt", admin, { body: body({ qtNumber: "QT-6", file: { name: "big.png", dataUrl: big } }) })).details).toEqual([{ path: ["file"], code: "FILE_TOO_BIG" }]);
  });

  it("is for the Admin only", () => {
    expect(fails(() => call("GET /qt", worker)).status).toBe(403);
    expect(fails(() => call("POST /qt", worker, { body: body({ qtNumber: "QT-9" }) })).status).toBe(403);
  });
});
