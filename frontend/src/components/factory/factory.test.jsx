import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";

import { stepAbilities, transferActions, workOrderActions } from "@/config/factory";

import { StepProgress } from "./StepProgress";
import { WorkOrderCard } from "./WorkOrderCard";

const manager = { memberships: [{ department: "Factory", role: "Manager" }] };
const worker = { memberships: [{ department: "Factory", role: "Worker" }] };
const sale = { memberships: [{ department: "Sale", role: "Manager" }] };

const step = (stepNo, status, extra = {}) => ({ id: stepNo, stepNo, processName: ["Press", "Foam", "Assembly", "QC"][stepNo - 1], status, machineCode: "LN-0" + stepNo, operatorName: null, canStart: false, ...extra });
const steps = [step(1, "done"), step(2, "done"), step(3, "in_progress", { operatorName: "Ken Suzuki" }), step(4, "pending")];
const wo = (overrides = {}) => ({
  id: 1,
  number: "WO-2026-0001",
  status: "in_process",
  saleOrderNumber: "SO-2026-0001",
  customerName: "ABC Appliance Store",
  productCode: "RF-2D",
  productName: "Refrigerator 2-Door 15Q",
  uom: "pcs",
  qty: 12,
  planStart: "2026-10-02",
  planFinish: "2026-10-05",
  steps,
  progress: { stepsDone: 2, stepsTotal: 4, currentStep: steps[2], producedQty: 0, transferredQty: 0, late: false, lateDays: 0 },
  history: [],
  ...overrides,
});

const keys = (list) => list.map((action) => action.key);

describe("StepProgress", () => {
  it("shows one circle per step and says the state of each in words", () => {
    render(<StepProgress steps={steps} size="md" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveAccessibleName("Step 1: Press, Done");
    expect(items[2]).toHaveAccessibleName("Step 3: Assembly, Running");
    expect(items[3]).toHaveAccessibleName("Step 4: QC, Waiting");
  });

  it("can leave the labels out for a small card", () => {
    render(<StepProgress steps={steps} showLabels={false} />);
    expect(screen.queryByText("Press")).not.toBeInTheDocument();
  });
});

describe("WorkOrderCard", () => {
  const show = (order) => render(<MemoryRouter><WorkOrderCard wo={order} to="/factory/work-orders/1" /></MemoryRouter>);

  it("shows who and what, the running step with its machine and operator, and how many steps are done", () => {
    show(wo());
    const card = screen.getByRole("link");
    expect(card).toHaveAttribute("href", "/factory/work-orders/1");
    expect(within(card).getByText("WO-2026-0001")).toBeInTheDocument();
    expect(within(card).getByText("In process")).toBeInTheDocument();
    expect(card).toHaveTextContent("RF-2D");
    expect(card).toHaveTextContent("× 12 pcs");
    expect(card).toHaveTextContent("for SO-2026-0001 · ABC Appliance Store");
    expect(card).toHaveTextContent("Now: Assembly · LN-03");
    expect(card).toHaveTextContent("Ken Suzuki");
    expect(within(card).getAllByText("2 of 4 steps").length).toBeGreaterThan(0);
    expect(within(card).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  });

  it("warns when the work order is late and says how many days", () => {
    show(wo({ progress: { ...wo().progress, late: true, lateDays: 2 } }));
    expect(screen.getByRole("status")).toHaveTextContent("2 days late");
  });

  it("shows the produced quantity of a finished work order and that everything was transferred", () => {
    const done = steps.map((s) => ({ ...s, status: "done" }));
    show(wo({ status: "finished", steps: done, progress: { stepsDone: 4, stepsTotal: 4, currentStep: null, producedQty: 12, transferredQty: 12, late: false, lateDays: 0 } }));
    expect(screen.getByRole("link")).toHaveTextContent("Produced 12 of 12 pcs");
    expect(screen.getByRole("link")).toHaveTextContent("all transferred");
  });

  it("says a draft is not scheduled yet", () => {
    show(wo({ status: "draft", steps: steps.map((s) => ({ ...s, status: "pending" })), progress: { stepsDone: 0, stepsTotal: 4, currentStep: null, producedQty: 0, transferredQty: 0, late: false, lateDays: 0 }, planStart: null, planFinish: null }));
    expect(screen.getByRole("link")).toHaveTextContent("Not scheduled yet");
    expect(screen.getByRole("link")).toHaveTextContent("No plan dates");
  });
});

describe("work order actions by role and status", () => {
  const history = (n) => Array.from({ length: n }, (_, i) => ({ id: i, status: "x" }));

  it("lets only a Manager schedule a draft; anyone may cancel it", () => {
    expect(keys(workOrderActions({ status: "draft", steps, history: history(1) }, manager))).toEqual(["schedule", "cancel"]);
    expect(keys(workOrderActions({ status: "draft", steps, history: history(1) }, worker))).toEqual(["cancel"]);
  });

  it("lets a scheduled order be started by anyone and sent back to draft by a Manager", () => {
    expect(keys(workOrderActions({ status: "scheduled", steps, history: history(2) }, worker))).toEqual(["start", "cancel"]);
    expect(keys(workOrderActions({ status: "scheduled", steps, history: history(2) }, manager))).toEqual(["start", "back-to-draft", "cancel", "revert"]);
  });

  it("offers Finish to a Manager only when no step is running, and asks for a reason while steps are not done", () => {
    expect(keys(workOrderActions({ status: "in_process", steps, history: history(3) }, manager))).not.toContain("finish"); // step 3 is running
    const waiting = steps.map((s) => (s.status === "in_progress" ? { ...s, status: "pending" } : s));
    const finish = workOrderActions({ status: "in_process", steps: waiting, history: history(3) }, manager).find((a) => a.key === "finish");
    expect(finish.noteLabel).toBe("required");
    const allDone = steps.map((s) => ({ ...s, status: "done" }));
    expect(workOrderActions({ status: "in_process", steps: allDone, history: history(3) }, manager).find((a) => a.key === "finish").noteLabel).toBe("optional");
    expect(keys(workOrderActions({ status: "in_process", steps: allDone, history: history(3) }, worker))).toEqual([]);
  });

  it("gives Revert to a Manager and nothing to a user outside Factory", () => {
    expect(keys(workOrderActions({ status: "finished", steps, history: history(4) }, manager))).toEqual(["revert"]);
    expect(workOrderActions({ status: "draft", steps, history: history(1) }, sale).map((a) => a.key)).toEqual(["cancel"]); // the page itself is closed to Sale; the list is not the guard
  });

  it("lets a Manager transfer a draft transfer and revert a transferred one", () => {
    expect(keys(transferActions({ status: "draft" }, manager))).toEqual(["transfer"]);
    expect(keys(transferActions({ status: "draft" }, worker))).toEqual([]);
    expect(keys(transferActions({ status: "transferred" }, manager))).toEqual(["revert"]);
  });
});

describe("what a user may do with a step", () => {
  const order = (status) => ({ status, steps });

  it("lets a Worker start a step that can start and finish the running one", () => {
    const ready = { ...step(4, "pending"), canStart: true };
    expect(stepAbilities(order("in_process"), ready, worker)).toMatchObject({ start: true, done: false });
    expect(stepAbilities(order("in_process"), steps[2], worker)).toMatchObject({ done: true, start: false });
  });

  it("does not let a Worker start a step early but lets a Manager (with a reason)", () => {
    expect(stepAbilities(order("in_process"), steps[3], worker).start).toBe(false);
    expect(stepAbilities(order("in_process"), steps[3], manager)).toMatchObject({ start: true, startEarly: true });
  });

  it("lets only a Manager reopen a done step, and only when the next one has not started", () => {
    expect(stepAbilities(order("in_process"), steps[1], manager).reopen).toBe(false); // step 3 already runs
    expect(stepAbilities(order("in_process"), { ...steps[1], stepNo: 4, status: "done" }, manager).reopen).toBe(true);
    expect(stepAbilities(order("in_process"), steps[0], worker).reopen).toBe(false);
  });

  it("allows nothing on a draft, a finished or a cancelled order", () => {
    for (const status of ["draft", "finished", "cancelled"]) {
      expect(stepAbilities(order(status), { ...step(1, "pending"), canStart: false }, manager)).toMatchObject({ start: false, done: false });
    }
  });
});
