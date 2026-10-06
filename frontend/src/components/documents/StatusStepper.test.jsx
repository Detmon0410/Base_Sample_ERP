import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ORDER_STATUSES, QUOTATION_STATUSES } from "@/config/sale";

import { StatusStepper } from "./StatusStepper";

const counts = { draft: 2, confirmed: 1, in_production: 0, ready_to_deliver: 1, delivered: 1, closed: 1, cancelled: 1 };

describe("StatusStepper", () => {
  it("shows every status in order with its number of documents", () => {
    render(<StatusStepper statuses={ORDER_STATUSES} counts={counts} value="all" onSelect={() => {}} unit="orders" />);
    const steps = screen.getAllByRole("button");
    expect(steps).toHaveLength(7);
    expect(steps[0]).toHaveTextContent("Step 1");
    expect(steps[0]).toHaveTextContent("Draft");
    expect(steps[0]).toHaveTextContent("2 orders");
    expect(steps[1]).toHaveTextContent("1 order");
    expect(steps[2]).toHaveTextContent("None"); // nothing in production
    expect(steps[6]).toHaveTextContent("Cancelled");
  });

  it("counts quotations in the words of quotations", () => {
    render(<StatusStepper statuses={QUOTATION_STATUSES} counts={{ draft: 3, sent: 1 }} value="all" onSelect={() => {}} unit="quotations" />);
    expect(screen.getByRole("button", { name: /Draft/ })).toHaveTextContent("3 quotations");
    expect(screen.getByRole("button", { name: /Sent/ })).toHaveTextContent("1 quotation");
  });

  it("filters by the pressed step and shows all when the selected step is pressed again", async () => {
    const onSelect = vi.fn();
    const { rerender } = render(<StatusStepper statuses={ORDER_STATUSES} counts={counts} value="all" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /Confirmed/ }));
    expect(onSelect).toHaveBeenLastCalledWith("confirmed");

    rerender(<StatusStepper statuses={ORDER_STATUSES} counts={counts} value="confirmed" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: /Confirmed/ })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: /Confirmed/ }));
    expect(onSelect).toHaveBeenLastCalledWith("all");
  });

  it("shows a dash-like placeholder while the counts are loading", () => {
    render(<StatusStepper statuses={ORDER_STATUSES} counts={undefined} value="all" onSelect={() => {}} />);
    expect(screen.getAllByRole("button")[0]).toHaveTextContent("…");
  });
});
