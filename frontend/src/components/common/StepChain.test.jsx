import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StepChain } from "./StepChain";
import { StatCard, StatRow } from "./StatCard";
import { TabBar } from "./TabBar";

const steps = [
  { key: "a", label: "First" },
  { key: "b", label: "Second" },
  { key: "c", label: "Third" },
];

describe("StepChain", () => {
  it("marks only the current step and lists every step in order", () => {
    render(<StepChain label="Steps" steps={steps} current="b" />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(["First", "Second", "Third"]);
    expect(items[1]).toHaveAttribute("aria-current", "step");
    expect(items[0]).not.toHaveAttribute("aria-current");
    expect(items[2]).not.toHaveAttribute("aria-current");
  });

  it("marks nothing as current when the key is past the last step", () => {
    render(<StepChain label="Steps" steps={steps} current="done" />);
    expect(screen.getAllByRole("listitem").some((item) => item.hasAttribute("aria-current"))).toBe(false);
  });
});

describe("StatCard", () => {
  it("shows the label and the number", () => {
    render(
      <StatRow>
        <StatCard label="Unpaid" value="3" />
      </StatRow>,
    );
    expect(screen.getByText("Unpaid")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("TabBar", () => {
  it("selects a tab on click and shows the counts", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    const picked = [];
    render(<TabBar label="Groups" value="one" onChange={(key) => picked.push(key)} tabs={[{ key: "one", label: "One", count: 2 }, { key: "two", label: "Two", count: 0 }]} />);
    expect(screen.getByRole("tab", { name: /Ones*2/ })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: /Twos*0/ }));
    expect(picked).toEqual(["two"]);
  });
});
