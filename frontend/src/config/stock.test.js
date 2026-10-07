import { adjustmentActions, canEditAdjustment, canWork, isStockManager, stockRole, stockStatusOf } from "./stock";

const admin = { id: 1, memberships: [{ department: null, role: "Admin" }] };
const factoryManager = { id: 6, memberships: [{ department: "Factory", role: "Manager" }] };
const factoryWorker = { id: 4, memberships: [{ department: "Factory", role: "Worker" }] };
const purchaseManager = { id: 7, memberships: [{ department: "Purchase", role: "Manager" }] };
const saleManager = { id: 2, memberships: [{ department: "Sale", role: "Manager" }] };
const saleAndPurchaseWorker = { id: 3, memberships: [{ department: "Sale", role: "Manager" }, { department: "Purchase", role: "Worker" }] };

const adj = (status, createdById = 4) => ({ status, createdById });
const keys = (list) => list.map((action) => action.key);

describe("stockStatusOf", () => {
  it("is Shortage at or under the reorder point, Near shortage up to 1.2 times it, otherwise Normal", () => {
    expect(stockStatusOf(40, 50)).toBe("shortage");
    expect(stockStatusOf(50, 50)).toBe("shortage");
    expect(stockStatusOf(51, 50)).toBe("near_shortage");
    expect(stockStatusOf(60, 50)).toBe("near_shortage");
    expect(stockStatusOf(61, 50)).toBe("normal");
    expect(stockStatusOf(0, 0)).toBe("shortage");
    expect(stockStatusOf(5, null)).toBe("not_set"); // the reorder level is optional
    expect(stockStatusOf(5, undefined)).toBe("not_set");
  });
});

describe("who works in Stock", () => {
  it("is Factory and Purchase (the best role of the two) and Admin; nobody else", () => {
    expect(stockRole(admin)).toBe("Admin");
    expect(stockRole(factoryManager)).toBe("Manager");
    expect(stockRole(factoryWorker)).toBe("Worker");
    expect(stockRole(purchaseManager)).toBe("Manager");
    expect(stockRole(saleManager)).toBeNull();
    expect(stockRole(saleAndPurchaseWorker)).toBe("Worker"); // the Sale Manager role does not count
    expect(canWork(saleManager)).toBe(false);
    expect(isStockManager(factoryWorker)).toBe(false);
    expect(isStockManager(admin)).toBe(true);
  });
});

describe("adjustmentActions", () => {
  it("lets the author of a draft request approval or cancel it", () => {
    expect(keys(adjustmentActions(adj("draft"), factoryWorker))).toEqual(["request", "cancel"]);
    expect(keys(adjustmentActions(adj("draft"), purchaseManager))).toEqual(["request", "cancel"]); // a Manager may handle anyone's draft
    expect(adjustmentActions(adj("draft", 99), factoryWorker)).toEqual([]); // not the author, not a Manager
  });

  it("lets a Manager who is not the author approve or reject a pending adjustment, with a reason to reject", () => {
    const list = adjustmentActions(adj("pending", 4), factoryManager);
    expect(keys(list)).toEqual(["approve", "reject", "back-to-draft"]);
    expect(list.find((action) => action.key === "reject")).toMatchObject({ noteLabel: "required", danger: true });
  });

  it("never lets anybody approve their own adjustment, and a Worker never approves", () => {
    expect(keys(adjustmentActions(adj("pending", 6), factoryManager))).toEqual(["back-to-draft"]);
    expect(keys(adjustmentActions(adj("pending", 4), factoryWorker))).toEqual(["back-to-draft"]);
    expect(adjustmentActions(adj("pending", 4), saleManager)).toEqual([]);
  });

  it("offers nothing once the adjustment is decided", () => {
    for (const status of ["approved", "rejected", "cancelled"]) expect(adjustmentActions(adj(status), factoryManager)).toEqual([]);
  });
});

describe("canEditAdjustment", () => {
  it("is a draft, for its author or a Manager", () => {
    expect(canEditAdjustment(adj("draft"), factoryWorker)).toBe(true);
    expect(canEditAdjustment(adj("draft", 99), factoryWorker)).toBe(false);
    expect(canEditAdjustment(adj("draft", 99), factoryManager)).toBe(true);
    expect(canEditAdjustment(adj("pending"), factoryManager)).toBe(false);
    expect(canEditAdjustment(adj("draft"), saleManager)).toBe(false);
  });
});
