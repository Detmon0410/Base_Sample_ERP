import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";

const admin = mockUsers[0];
const factory = mockUsers[1];
const sale = mockUsers[2];
const call = (route, who, { body = {}, params = {}, query = {} } = {}) => mockRoutes[route]({ body, authorization: `Bearer ${tokenOf(who)}`, params, query });
const fails = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("it should have failed");
};
const pdf = (name = "a.pdf") => ({ name, dataUrl: "data:application/pdf;base64,AAAA" });

const customer = call("POST /customers", admin, { body: { name: "File Customer" } }).data;
const product = call("POST /products", admin, { body: { code: "FILE-P", name: "P", price: 1 } }).data;
const qt = call("POST /qt", admin, { body: { qtNumber: "QT-FILE", qtDate: "2026-10-01", customerId: customer.id } }).data;
const order = call("POST /orders", admin, { body: { qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 1, unitPrice: 1, processes: [{ name: "Cut" }] }] } }).data;

const upload = (who, ownerType, ownerId, kind, file = pdf()) => call("POST /attachments", who, { body: { ownerType, ownerId, kind, file } });
const list = (who, ownerType, ownerId) => call("GET /attachments", who, { query: { ownerType, ownerId } });

describe("files of the mock", () => {
  it("keeps the evidence of an order with who and when, lists it without the file, and gives the file on its own", () => {
    const made = upload(factory, "ProductionOrder", order.id, "EVIDENCE", { name: "weld.png", dataUrl: "data:image/png;base64,AAAAAAAA" }).data;
    expect(made).toMatchObject({ ownerType: "ProductionOrder", ownerId: order.id, kind: "EVIDENCE", fileName: "weld.png", fileType: "image/png", size: 6, uploadedByName: "Worker" });
    expect(made.dataUrl).toBeUndefined();
    expect(made.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const rows = list(sale, "ProductionOrder", order.id); // everybody who can read the order reads its files
    expect(rows).toHaveLength(1);
    expect(rows[0].dataUrl).toBeUndefined();

    const one = call("GET /attachments/:id", sale, { params: { id: made.id } });
    expect(one.file).toEqual({ name: "weld.png", type: "image/png", dataUrl: "data:image/png;base64,AAAAAAAA" });
  });

  it("lists the newest file first", () => {
    upload(admin, "ProductionOrder", order.id, "OTHER", pdf("second.pdf"));
    expect(list(admin, "ProductionOrder", order.id).map((row) => row.fileName)[0]).toBe("second.pdf");
  });

  it("checks the owner, the kind and the file", () => {
    expect(fails(() => upload(admin, "Nothing", order.id, "OTHER")).details).toEqual([{ path: ["ownerType"], code: "INVALID" }]);
    expect(fails(() => upload(admin, "ProductionOrder", 999999, "OTHER")).code).toBe("NOT_FOUND");
    expect(fails(() => upload(admin, "ProductionOrder", order.id, "PO_FILE")).details).toEqual([{ path: ["kind"], code: "INVALID" }]); // a PO file is not for an order
    expect(fails(() => upload(admin, "ProductionOrder", order.id, "")).details).toEqual([{ path: ["kind"], code: "REQUIRED" }]);
    expect(fails(() => upload(admin, "ProductionOrder", order.id, "OTHER", null)).details).toEqual([{ path: ["file"], code: "REQUIRED" }]);
    expect(fails(() => upload(admin, "ProductionOrder", order.id, "OTHER", { name: "x.txt", dataUrl: "data:text/plain;base64,AAAA" })).details).toEqual([{ path: ["file"], code: "FILE_TYPE" }]);
    const big = `data:application/pdf;base64,${"A".repeat(Math.ceil((10 * 1024 * 1024 * 4) / 3) + 8)}`;
    expect(fails(() => upload(admin, "ProductionOrder", order.id, "OTHER", { name: "big.pdf", dataUrl: big })).details).toEqual([{ path: ["file"], code: "FILE_TOO_BIG" }]);
  });

  it("lets only the Admin and the Factory Worker upload to an order, and only the Admin and the Sale Worker to a QT", () => {
    expect(fails(() => upload(sale, "ProductionOrder", order.id, "EVIDENCE")).status).toBe(403);
    expect(upload(factory, "ProductionOrder", order.id, "EVIDENCE").status).toBe(201);
    expect(fails(() => upload(factory, "QtReference", qt.id, "PO_FILE")).status).toBe(403);
    expect(fails(() => list(factory, "QtReference", qt.id)).status).toBe(403);
    expect(upload(sale, "QtReference", qt.id, "PO_FILE").status).toBe(201);
    expect(list(sale, "QtReference", qt.id)).toHaveLength(1);
  });

  it("keeps one PO file per QT: a new one replaces the old one, the other kinds stay", () => {
    upload(sale, "QtReference", qt.id, "QUOTATION", pdf("quotation.pdf"));
    upload(sale, "QtReference", qt.id, "PO_FILE", pdf("po-2.pdf"));
    const rows = list(admin, "QtReference", qt.id);
    expect(rows.filter((row) => row.kind === "PO_FILE").map((row) => row.fileName)).toEqual(["po-2.pdf"]);
    expect(rows.filter((row) => row.kind === "QUOTATION")).toHaveLength(1);
  });

  it("deletes a file for the roles that may upload, and a deleted QT takes its files with it", () => {
    const made = upload(factory, "ProductionOrder", order.id, "OTHER", pdf("to-delete.pdf")).data;
    expect(fails(() => call("DELETE /attachments/:id", sale, { params: { id: made.id } })).status).toBe(403);
    expect(call("DELETE /attachments/:id", factory, { params: { id: made.id } })).toBeNull();
    expect(fails(() => call("GET /attachments/:id", factory, { params: { id: made.id } })).status).toBe(404);

    const lone = call("POST /qt", admin, { body: { qtNumber: "QT-FILE-2", qtDate: "2026-10-01", customerId: customer.id } }).data;
    const mine = upload(admin, "QtReference", lone.id, "OTHER").data;
    call("DELETE /qt/:id", admin, { params: { id: lone.id } });
    expect(fails(() => call("GET /attachments/:id", admin, { params: { id: mine.id } })).status).toBe(404);
  });

  it("needs a signed-in user", () => {
    const error = fails(() => mockRoutes["GET /attachments"]({ body: {}, authorization: undefined, params: {}, query: { ownerType: "ProductionOrder", ownerId: order.id } }));
    expect(error.status).toBe(401);
  });
});
