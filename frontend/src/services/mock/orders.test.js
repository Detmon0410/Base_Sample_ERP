import { describe, expect, it } from "vitest";

import { mockRoutes } from "./routes.js";
import { mockUsers, tokenOf } from "./users.js";
import { makeOrderRoutes } from "@/test/orders";

const admin = mockUsers[0];
const worker = mockUsers[1]; // a Factory Worker
const sale = mockUsers[2]; // a Sale Worker
const call = (route, who, { body = {}, params = {}, query = {} } = {}) => mockRoutes[route]({ body, authorization: `Bearer ${tokenOf(who)}`, params, query });
const fails = (fn) => {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("it should have failed");
};

const customer = call("POST /customers", admin, { body: { name: "Order Customer" } }).data;
const product = call("POST /products", admin, { body: { code: "ORD-P", name: "Fridge", price: 1000 } }).data;
const qt = call("POST /qt", admin, { body: { qtNumber: "QT-ORD", qtDate: "2026-10-01", customerId: customer.id, file: { name: "a.pdf", dataUrl: "data:application/pdf;base64,AA==" } } }).data;

const draft = (extra = {}) => ({
  qtId: qt.id,
  customerId: customer.id,
  orderDate: "2026-10-02",
  notes: "",
  lines: [{ productId: product.id, quantity: 10, unitPrice: 900, processes: [{ name: "Cut", instructions: "" }, { name: "Weld", instructions: "Slowly" }] }],
  ...extra,
});
const progress = (who, order, process, extra) =>
  call("POST /orders/:id/progress", who, { params: { id: order.id }, body: { processId: process.id, status: "In Progress", completedQuantity: 4, workDate: "2026-10-03", note: "", ...extra } });

describe("production orders of the mock", () => {
  it("numbers the orders ORD-year-0001, keeps the step order, and lists them with the computed status", () => {
    const year = new Date().getFullYear();
    const first = makeOrderRoutes(call, admin, draft()).data;
    const second = makeOrderRoutes(call, admin, draft()).data;
    expect(first.orderNumber).toBe(`ORD-${year}-0001`);
    expect(second.orderNumber).toBe(`ORD-${year}-0002`);
    expect(first.status).toBe("Draft");
    expect(first.lines[0].processes.map((process) => [process.sequence, process.name])).toEqual([[1, "Cut"], [2, "Weld"]]);
    expect(first.qtNumber).toMatch(/^QT-T\d+$/); // made by Confirm QT

    const list = call("GET /orders", worker, { query: { status: "Draft", q: "order customer" } });
    expect(list.meta.total).toBe(2);
    expect(list.data[0].lines).toBeUndefined();
  });

  it("checks the change of an order, and never changes its QT or its customer", () => {
    const order = makeOrderRoutes(call, admin, draft()).data;
    const issues = fails(() => call("PUT /orders/:id", admin, { params: { id: order.id }, body: draft({ orderDate: "2026-13-01", lines: [{ productId: product.id, quantity: 0, unitPrice: -1, processes: [{ name: " " }] }] }) })).details;
    expect(issues.map((item) => `${item.path.join(".")}:${item.code}`)).toEqual(["orderDate:INVALID_DATE", "lines.0.quantity:INVALID", "lines.0.unitPrice:INVALID", "lines.0.processes.0.name:REQUIRED"]);

    const other = call("POST /customers", admin, { body: { name: "Another" } }).data;
    const changed = call("PUT /orders/:id", admin, { params: { id: order.id }, body: draft({ qtId: 999, customerId: other.id }) });
    expect([changed.qtId, changed.customerId]).toEqual([order.qtId, order.customerId]);
  });

  it("has no way to make an order by hand: an order comes from Confirm QT", () => {
    expect(mockRoutes["POST /orders"]).toBeUndefined();
  });

  it("starts only an order with a line and a process on every line, and then locks the products and processes", () => {
    const empty = makeOrderRoutes(call, admin, draft({ lines: [] })).data;
    expect(fails(() => call("POST /orders/:id/start", admin, { params: { id: empty.id } })).code).toBe("ORDER_NOT_READY");
    const noProcess = makeOrderRoutes(call, admin, draft({ lines: [{ productId: product.id, quantity: 1, unitPrice: 1, processes: [] }] })).data;
    expect(fails(() => call("POST /orders/:id/start", admin, { params: { id: noProcess.id } })).code).toBe("ORDER_NOT_READY");

    const order = makeOrderRoutes(call, admin, draft()).data;
    expect(fails(() => call("POST /orders/:id/start", sale, { params: { id: order.id } })).status).toBe(403); // a Sale Worker only prepares the order
    expect(call("POST /orders/:id/start", admin, { params: { id: order.id } }).status).toBe("Draft"); // no process has started yet
    expect(fails(() => call("PUT /orders/:id", admin, { params: { id: order.id }, body: draft() })).code).toBe("ORDER_LOCKED");
    expect(fails(() => call("POST /orders/:id/start", admin, { params: { id: order.id } })).code).toBe("ALREADY_STARTED");
  });

  it("records progress by the rules, keeps every update, and completes the order when every process is completed", () => {
    const order = makeOrderRoutes(call, admin, draft()).data;
    const [cut, weld] = order.lines[0].processes;
    expect(fails(() => progress(worker, order, cut)).code).toBe("ORDER_NOT_STARTED");
    call("POST /orders/:id/start", admin, { params: { id: order.id } });

    expect(fails(() => progress(worker, order, cut, { completedQuantity: 11 })).details).toEqual([{ path: ["completedQuantity"], code: "TOO_HIGH" }]);
    expect(fails(() => progress(worker, order, cut, { status: "Completed", completedQuantity: 9 })).details).toEqual([{ path: ["completedQuantity"], code: "MUST_EQUAL_REQUIRED" }]);
    expect(fails(() => progress(worker, order, cut, { status: "In Progress", completedQuantity: 10 })).details).toEqual([{ path: ["status"], code: "MUST_BE_COMPLETED" }]);
    expect(fails(() => progress(worker, order, cut, { workDate: "" })).details).toEqual([{ path: ["workDate"], code: "REQUIRED" }]);

    progress(worker, order, cut, { completedQuantity: 4 });
    let view = progress(worker, order, cut, { completedQuantity: 7 });
    expect(view.lines[0].processes[0].completedQuantity).toBe(7); // the latest total, not 4 + 7
    expect(view.history.map((entry) => [entry.completedQuantity, entry.userName])).toEqual([[7, "Factory Worker"], [4, "Factory Worker"]]);

    progress(worker, order, cut, { status: "Completed", completedQuantity: 10 });
    expect(call("GET /orders/:id", admin, { params: { id: order.id } }).status).toBe("In Progress");
    expect(view.status).toBe("In Progress"); // a process has started
    view = progress(worker, order, weld, { status: "Completed", completedQuantity: 10 });
    expect(view.status).toBe("Completed");
    expect(view.history).toHaveLength(4);
  });

  it("lets only an Admin reopen a completed process, and only with a note", () => {
    const order = makeOrderRoutes(call, admin, draft()).data;
    const [cut] = order.lines[0].processes;
    call("POST /orders/:id/start", admin, { params: { id: order.id } });
    progress(worker, order, cut, { status: "Completed", completedQuantity: 10 });

    expect(fails(() => progress(worker, order, cut, { completedQuantity: 5 })).code).toBe("COMPLETED_LOCKED");
    expect(fails(() => progress(admin, order, cut, { completedQuantity: 5 })).details).toEqual([{ path: ["note"], code: "REOPEN_NOTE" }]);
    const view = progress(admin, order, cut, { completedQuantity: 5, note: "Wrong count" });
    expect(view.lines[0].processes[0].status).toBe("In Progress");
    expect(view.history[0].note).toBe("Wrong count");
  });
});
