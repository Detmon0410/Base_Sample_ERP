import { isNewRow, markRowSeen, rowTime, splitRowPath } from "./rowSeen";

const old = "2000-01-01T00:00:00.000Z";
const at = (minutes) => new Date(Date.UTC(2026, 9, 8, 9, minutes)).toISOString(); // 09:00 is when the user first appears

describe("which rows are new for a user", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 8, 9, 0)));
  });
  afterEach(() => vi.useRealTimers());

  it("reads the time of the last change of a row", () => {
    expect(rowTime({ history: [{ at: "B" }, { at: "A" }], updatedAt: "C" })).toBe("B");
    expect(rowTime({ updatedAt: "C", createdAt: "D" })).toBe("C");
    expect(rowTime({ createdAt: "D" })).toBe("D");
    expect(rowTime({})).toBeNull();
  });

  it("splits where a row opens into the list and the id", () => {
    expect(splitRowPath("/purchase/orders/12?status=sent")).toEqual({ list: "/purchase/orders", id: "12" });
    expect(splitRowPath("/trace/RF-2D-26-000001")).toEqual({ list: "/trace", id: "RF-2D-26-000001" });
  });

  it("does not mark what is older than the user, marks what changed later, and forgets the dot when the row is opened", () => {
    expect(isNewRow(1, "/sale/orders", "5", { history: [{ at: old }] })).toBe(false); // old: it was there before the user
    const changed = { history: [{ at: at(1) }] };
    expect(isNewRow(1, "/sale/orders", "5", changed)).toBe(true); // arrived after
    vi.setSystemTime(new Date(Date.UTC(2026, 9, 8, 9, 2)));
    markRowSeen(1, "/sale/orders", "5");
    expect(isNewRow(1, "/sale/orders", "5", changed)).toBe(false); // opened
    expect(isNewRow(1, "/sale/orders", "5", { history: [{ at: at(5) }] })).toBe(true); // changed again after it was opened
    expect(isNewRow(1, "/sale/orders", "6", changed)).toBe(true); // another row is untouched
    expect(isNewRow(2, "/sale/orders", "5", changed)).toBe(false); // another user who appears later: what happened before is old for them
  });

  it("has nothing new for a row without a time or without a user", () => {
    expect(isNewRow(1, "/x", "1", {})).toBe(false);
    expect(isNewRow(null, "/x", "1", { updatedAt: at(1) })).toBe(false);
  });
});
