import { render, screen } from "@testing-library/react";

import { BILL_STATUSES, ENTRY_STATUSES, INVOICE_STATUSES, MONEY_STATUSES } from "@/config/accounting";
import { TRANSFER_STATUSES, WORK_ORDER_STATUSES } from "@/config/factory";
import { PO_STATUSES, RECEIPT_STATUSES } from "@/config/purchase";
import { ORDER_STATUSES, QUOTATION_STATUSES, STATUS_COLORS } from "@/config/sale";
import { ADJUSTMENT_STATUSES } from "@/config/stock";

import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { StatusStepper } from "./StatusStepper";

// Every module brings its own statuses to the shared badge and stepper. A status without an icon, a colour or a text
// breaks a whole list (the page does not draw), so every status of every module is drawn here.
const MODULES = { quotations: QUOTATION_STATUSES, orders: ORDER_STATUSES, workOrders: WORK_ORDER_STATUSES, transfers: TRANSFER_STATUSES, adjustments: ADJUSTMENT_STATUSES, purchaseOrders: PO_STATUSES, receipts: RECEIPT_STATUSES, invoices: INVOICE_STATUSES, bills: BILL_STATUSES, money: MONEY_STATUSES, entries: ENTRY_STATUSES };
const ALL = [...new Set(Object.values(MODULES).flat())];

describe("shared statuses", () => {
  it.each(ALL)("has a colour for %s", (status) => {
    expect(STATUS_COLORS[status]).toBeTruthy();
  });

  it.each(ALL)("draws the badge of %s with its words", (status) => {
    const { container } = render(<DocumentStatusBadge status={status} />);
    expect(container.textContent).not.toMatch(/^status\./);
    expect(container.textContent.trim().length).toBeGreaterThan(2);
    expect(container.querySelector("svg")).not.toBeNull(); // never colour alone
  });

  it.each(Object.entries(MODULES))("draws the stepper of %s", (unit, statuses) => {
    render(<StatusStepper statuses={statuses} counts={{}} value="all" onSelect={() => {}} unit={unit === "money" ? "payments" : unit} />);
    expect(screen.getAllByRole("button")).toHaveLength(statuses.length);
  });
});
