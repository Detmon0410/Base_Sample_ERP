import { canDecide, canEditOrder, canEditReceipt, canReceive, canWork, isPurchaseManager, purchaseOrderActions, purchaseRole, receiptActions } from "./purchase";

const admin = { id: 1, memberships: [{ department: null, role: "Admin" }] };
const manager = { id: 7, memberships: [{ department: "Purchase", role: "Manager" }] };
const worker = { id: 2, memberships: [{ department: "Sale", role: "Manager" }, { department: "Purchase", role: "Worker" }] };
const factory = { id: 6, memberships: [{ department: "Factory", role: "Manager" }] };

const po = (status, extra = {}) => ({ status, createdById: 2, receipts: [], ...extra });
const keys = (list) => list.map((action) => action.key);

describe("who works in Purchase", () => {
  it("is the Purchase department (its role, not the Sale role) and Admin; nobody else", () => {
    expect(purchaseRole(worker)).toBe("Worker");
    expect(purchaseRole(manager)).toBe("Manager");
    expect(purchaseRole(admin)).toBe("Admin");
    expect(canWork(factory)).toBe(false);
    expect(isPurchaseManager(worker)).toBe(false);
    expect(isPurchaseManager(admin)).toBe(true);
  });
});

describe("purchaseOrderActions", () => {
  it("lets the author (or a Manager) ask for approval or cancel a draft; nobody sends a draft", () => {
    expect(keys(purchaseOrderActions(po("draft"), worker))).toEqual(["request-approval", "cancel"]);
    expect(keys(purchaseOrderActions(po("draft"), manager))).toEqual(["request-approval", "cancel"]);
    expect(purchaseOrderActions(po("draft", { createdById: 99 }), worker)).toEqual([]);
  });

  it("lets a Manager approve or reject a pending PO of somebody else, never the Manager's own, and never a Worker", () => {
    expect(keys(purchaseOrderActions(po("pending"), manager))).toEqual(["approve", "reject", "withdraw"]);
    expect(purchaseOrderActions(po("pending"), manager).find((action) => action.key === "reject")).toMatchObject({ noteLabel: "required" });
    expect(keys(purchaseOrderActions(po("pending", { createdById: 7 }), manager))).toEqual(["withdraw"]); // own PO: only withdraw
    expect(keys(purchaseOrderActions(po("pending", { createdById: 7 }), admin))).toEqual(["approve", "reject", "withdraw"]); // an Admin always may
    expect(keys(purchaseOrderActions(po("pending"), worker))).toEqual(["withdraw"]);
    expect(canDecide(po("draft"), manager)).toBe(false);
  });

  it("sends only an approved PO, and lets a rejected one be corrected and asked again", () => {
    expect(keys(purchaseOrderActions(po("approved"), manager))).toEqual(["send", "cancel"]);
    expect(purchaseOrderActions(po("approved"), worker)).toEqual([]);
    expect(keys(purchaseOrderActions(po("rejected"), worker))).toEqual(["request-approval", "cancel"]);
    expect(canEditOrder(po("rejected"), worker)).toBe(true);
    expect(canEditOrder(po("pending"), manager)).toBe(false);
  });

  it("offers a Manager back to draft and cancel (with a reason) only while nothing is received", () => {
    const list = purchaseOrderActions(po("sent"), manager);
    expect(keys(list)).toEqual(["back-to-draft", "cancel"]);
    expect(list.find((action) => action.key === "cancel")).toMatchObject({ noteLabel: "required", danger: true });
    expect(purchaseOrderActions(po("sent", { receipts: [{ status: "posted" }] }), manager)).toEqual([]);
    expect(purchaseOrderActions(po("sent"), worker)).toEqual([]);
  });

  it("closes the rest of a partly received PO with a reason, closes a received one, and reverts a closed or cancelled one", () => {
    expect(purchaseOrderActions(po("partially_received"), manager)).toEqual([{ key: "close-remaining", noteLabel: "required" }]);
    expect(keys(purchaseOrderActions(po("received"), manager))).toEqual(["close"]);
    expect(keys(purchaseOrderActions(po("closed"), manager))).toEqual(["revert"]);
    expect(keys(purchaseOrderActions(po("cancelled"), manager))).toEqual(["revert"]);
    expect(purchaseOrderActions(po("received"), worker)).toEqual([]);
  });
});

describe("receipts and editing", () => {
  it("posts or cancels a draft receipt for its author or a Manager; only a Manager cancels a posted one, with a reason", () => {
    const gr = (status, extra = {}) => ({ status, createdById: 2, poStatus: "partially_received", ...extra });
    expect(keys(receiptActions(gr("draft"), worker))).toEqual(["post", "cancel"]);
    expect(receiptActions(gr("draft", { createdById: 99 }), worker)).toEqual([]);
    expect(receiptActions(gr("posted"), worker)).toEqual([]);
    expect(receiptActions(gr("posted"), manager)).toEqual([{ key: "cancel", noteLabel: "required", danger: true }]);
    expect(receiptActions(gr("posted", { poStatus: "closed" }), manager)).toEqual([]);
  });

  it("edits a draft only (author or Manager) and receives only against a sent or partly received PO", () => {
    expect(canEditOrder(po("draft"), worker)).toBe(true);
    expect(canEditOrder(po("draft", { createdById: 99 }), worker)).toBe(false);
    expect(canEditOrder(po("draft", { createdById: 99 }), manager)).toBe(true);
    expect(canEditOrder(po("sent"), manager)).toBe(false);
    expect(canEditReceipt({ status: "draft", createdById: 2 }, worker)).toBe(true);
    expect(canEditReceipt({ status: "posted", createdById: 2 }, manager)).toBe(false);
    expect(canReceive(po("sent"), worker)).toBe(true);
    expect(canReceive(po("partially_received"), worker)).toBe(true);
    for (const status of ["draft", "received", "closed", "cancelled"]) expect(canReceive(po(status), worker)).toBe(false);
    expect(canReceive(po("sent"), factory)).toBe(false);
  });
});
