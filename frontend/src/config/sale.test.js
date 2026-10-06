import { canWork, deliveryActions, documentTotals, isSaleManager, orderActions, quotationActions } from "./sale";

const admin = { memberships: [{ department: null, role: "Admin" }] };
const manager = { memberships: [{ department: "Sale", role: "Manager" }] };
const worker = { memberships: [{ department: "Sale", role: "Worker" }] };
const factory = { memberships: [{ department: "Factory", role: "Worker" }] };

const keys = (actions) => actions.map((action) => action.key);
const history = (count) => Array.from({ length: count }, (_, i) => ({ id: i, status: "x" }));

describe("documentTotals", () => {
  it("adds the lines and takes 10 % tax rounded down", () => {
    const totals = documentTotals([
      { qty: 2, unitPrice: 68000 },
      { qty: 1, unitPrice: 41005 },
    ]);
    expect(totals).toEqual({ subtotal: 177005, tax: 17700, total: 194705 });
  });

  it("is zero for no lines and ignores empty or invalid cells", () => {
    expect(documentTotals([])).toEqual({ subtotal: 0, tax: 0, total: 0 });
    expect(documentTotals(undefined)).toEqual({ subtotal: 0, tax: 0, total: 0 });
    expect(documentTotals([{ qty: null, unitPrice: 500 }, { qty: "3", unitPrice: "100" }]).subtotal).toBe(300);
  });
});

describe("who may work in Sale", () => {
  it("lets Sale people and the Admin work, nobody else", () => {
    expect(canWork(worker)).toBe(true);
    expect(canWork(manager)).toBe(true);
    expect(canWork(admin)).toBe(true);
    expect(canWork(factory)).toBe(false);
  });

  it("makes the Manager and the Admin managers", () => {
    expect(isSaleManager(manager)).toBe(true);
    expect(isSaleManager(admin)).toBe(true);
    expect(isSaleManager(worker)).toBe(false);
  });
});

describe("quotation actions", () => {
  it("offers Send on a draft", () => {
    expect(keys(quotationActions({ status: "draft", history: history(1) }, worker))).toEqual(["send"]);
  });

  it("offers Accept, Reject and Expire on a sent quotation; Reject needs a note", () => {
    const actions = quotationActions({ status: "sent", history: history(2) }, worker);
    expect(keys(actions)).toEqual(["accept", "reject", "expire"]);
    expect(actions.find((action) => action.key === "reject").noteLabel).toBe("required");
  });

  it("offers Create sale order only while no live order exists", () => {
    const accepted = { status: "accepted", history: history(3), links: [] };
    expect(keys(quotationActions(accepted, worker))).toContain("create-order");
    expect(keys(quotationActions({ ...accepted, links: [{ type: "order", status: "draft" }] }, worker))).not.toContain("create-order");
    expect(keys(quotationActions({ ...accepted, links: [{ type: "order", status: "cancelled" }] }, worker))).toContain("create-order");
  });

  it("gives Revert to the Manager only, and only after a status change", () => {
    expect(keys(quotationActions({ status: "sent", history: history(2) }, manager))).toContain("revert");
    expect(keys(quotationActions({ status: "sent", history: history(2) }, worker))).not.toContain("revert");
    expect(keys(quotationActions({ status: "draft", history: history(1) }, manager))).not.toContain("revert");
  });
});

describe("sale order actions", () => {
  it("makes a Worker ask and a Manager approve", () => {
    expect(keys(orderActions({ status: "draft", approval: null, history: history(1) }, worker))).toEqual(["request-confirm", "cancel"]);
    expect(keys(orderActions({ status: "draft", approval: null, history: history(1) }, manager))).toEqual(["approve", "cancel"]);
  });

  it("offers no approval button while a request is waiting (the Manager has Approve / Reject elsewhere)", () => {
    expect(keys(orderActions({ status: "draft", approval: "requested", history: history(1) }, worker))).toEqual(["cancel"]);
  });

  it("follows the flow confirmed -> factory -> ready -> delivery note -> close", () => {
    expect(keys(orderActions({ status: "confirmed", history: history(2) }, worker))).toContain("send-to-factory");
    expect(keys(orderActions({ status: "in_production", history: history(3) }, worker))).toContain("mark-ready");
    expect(keys(orderActions({ status: "ready_to_deliver", history: history(4) }, worker))).toContain("create-delivery-note");
    expect(keys(orderActions({ status: "delivered", history: history(5) }, manager))).toContain("close");
    expect(keys(orderActions({ status: "delivered", history: history(5) }, worker))).not.toContain("close");
  });

  it("lets a Worker cancel only before production; later only the Manager, with a reason", () => {
    expect(keys(orderActions({ status: "confirmed", history: history(2) }, worker))).toContain("cancel");
    expect(keys(orderActions({ status: "in_production", history: history(3) }, worker))).not.toContain("cancel");
    const cancel = orderActions({ status: "in_production", history: history(3) }, manager).find((action) => action.key === "cancel");
    expect(cancel.noteLabel).toBe("required");
  });

  it("offers nothing on a closed or cancelled order except Revert to the Manager", () => {
    expect(keys(orderActions({ status: "closed", history: history(6) }, worker))).toEqual([]);
    expect(keys(orderActions({ status: "cancelled", history: history(2) }, manager))).toEqual(["revert"]);
  });
});

describe("delivery note actions", () => {
  it("confirms a draft and lets the Manager revert a delivered note", () => {
    expect(keys(deliveryActions({ status: "draft" }, worker))).toEqual(["confirm"]);
    expect(keys(deliveryActions({ status: "delivered" }, manager))).toEqual(["revert"]);
    expect(keys(deliveryActions({ status: "delivered" }, worker))).toEqual([]);
  });
});
