import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import { WorkOrderTimeline } from "./WorkOrderTimeline";
import { daysBetween, donePercent, lateSpan, pageDays, pageStart, planSpan, sortRows } from "./timelineLayout";

const wo = (id, overrides = {}) => ({
  id,
  number: `WO-2026-000${id}`,
  status: "scheduled",
  productName: "Refrigerator 2-Door 15Q",
  uom: "pcs",
  qty: 6,
  planStart: "2026-10-08",
  planFinish: "2026-10-12",
  progress: { stepsDone: 0, stepsTotal: 4, currentStep: null, late: false, lateDays: 0 },
  ...overrides,
});

describe("timelineLayout", () => {
  it("counts days across months and puts today a third from the left", () => {
    expect(daysBetween("2026-09-30", "2026-10-02")).toBe(2);
    expect(daysBetween("2026-10-05", "2026-10-01")).toBe(-4);
    expect(pageStart("2026-10-07", 14)).toBe("2026-10-03");
    const days = pageDays("2026-10-03", 14, "2026-10-07");
    expect(days).toHaveLength(14);
    expect(days.find((day) => day.today).iso).toBe("2026-10-07");
    expect(days[0].weekend).toBe(true); // Saturday 3 Oct 2026
  });

  it("places a plan on the page, clips it, or says it is off the page", () => {
    expect(planSpan(wo(1), "2026-10-03", 14)).toEqual({ from: 5, to: 9, before: false, after: false });
    expect(planSpan(wo(1, { planStart: "2026-09-30" }), "2026-10-03", 14)).toMatchObject({ from: 0, before: true });
    expect(planSpan(wo(1, { planFinish: "2026-11-30" }), "2026-10-03", 14)).toMatchObject({ to: 13, after: true });
    expect(planSpan(wo(1, { planStart: "2026-08-01", planFinish: "2026-08-05" }), "2026-10-03", 14)).toEqual({ outside: "before" });
    expect(planSpan(wo(1, { planStart: "2026-12-01", planFinish: "2026-12-05" }), "2026-10-03", 14)).toEqual({ outside: "after" });
    expect(planSpan(wo(1, { planStart: null, planFinish: null }), "2026-10-03", 14)).toBeNull();
  });

  it("marks the days a late work order runs past its plan, only up to today", () => {
    const late = wo(1, { planStart: "2026-10-02", planFinish: "2026-10-05", progress: { stepsDone: 2, stepsTotal: 4, late: true, lateDays: 2 } });
    expect(lateSpan(late, "2026-10-03", 14, "2026-10-07")).toEqual({ from: 3, to: 4 });
    expect(lateSpan(wo(2), "2026-10-03", 14, "2026-10-07")).toBeNull();
  });

  it("measures the done part by steps and sorts plan start first, no plan last", () => {
    expect(donePercent(wo(1, { progress: { stepsDone: 1, stepsTotal: 4 } }))).toBe(25);
    expect(donePercent(wo(1, { progress: { stepsDone: 0, stepsTotal: 0 } }))).toBe(0);
    const rows = sortRows([wo(1, { planStart: null, planFinish: null }), wo(2, { planStart: "2026-10-09" }), wo(3, { planStart: "2026-10-01" })]);
    expect(rows.map((row) => row.id)).toEqual([3, 2, 1]);
  });
});

describe("WorkOrderTimeline", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-07T09:00:00"));
  });
  afterEach(() => vi.useRealTimers());

  const items = [
    wo(1, { status: "in_process", planStart: "2026-10-02", planFinish: "2026-10-05", progress: { stepsDone: 2, stepsTotal: 4, currentStep: { processName: "Assembly" }, late: true, lateDays: 2 } }),
    wo(2),
    wo(3, { status: "draft", planStart: null, planFinish: null }),
    wo(4, { status: "finished", planStart: "2026-09-22", planFinish: "2026-09-30", progress: { stepsDone: 4, stepsTotal: 4, late: false, lateDays: 0 } }),
  ];
  const show = () => render(<MemoryRouter><WorkOrderTimeline items={items} status="ready" onRetry={() => {}} to={(row) => `/factory/work-orders/${row.id}`} /></MemoryRouter>);

  it("shows a bar per work order, the late mark, the work order without a plan, and hides finished ones", () => {
    show();
    expect(screen.getByRole("link", { name: /WO-2026-0001, .*2 of 4 steps, 2 days late/ })).toHaveAttribute("href", "/factory/work-orders/1");
    expect(screen.getByRole("link", { name: /WO-2026-0002, .*0 of 4 steps/ })).toBeInTheDocument();
    expect(screen.getByText("No plan dates", { selector: "p.bg-slate-50" })).toBeInTheDocument();
    expect(screen.getAllByText("2 days late").length).toBeGreaterThan(0);
    expect(screen.queryByText("WO-2026-0004")).not.toBeInTheDocument();
    expect(screen.getByText(/Today/, { selector: ".sr-only" })).toBeInTheDocument();
  });

  it("shows finished work orders when the switch is turned on, and moves the page with the buttons", async () => {
    vi.useRealTimers();
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("switch", { name: "Show finished and cancelled" }));
    expect(screen.getByText("WO-2026-0004")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Month" }));
    expect(screen.getByRole("button", { name: "Month" })).toHaveAttribute("aria-pressed", "true");
    const header = screen.getByText("Work order", { selector: "div" });
    expect(within(header.parentElement).getAllByText(/\d{4}/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Earlier" }));
    await user.click(screen.getByRole("button", { name: "Today" }));
  });
});
