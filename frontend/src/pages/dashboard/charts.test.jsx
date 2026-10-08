import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BarChart, BarList } from "./charts";

const format = (value) => `¥${value}`;

describe("dashboard charts", () => {
  it("says there is no data instead of drawing empty bars", () => {
    render(<BarChart data={[{ label: "May", values: [0] }]} series={[{ name: "Sales", className: "bg-primary" }]} format={format} compact={format} ariaLabel="Sales" emptyText="No data yet." />);
    expect(screen.getByText("No data yet.")).toBeInTheDocument();
  });

  it("always has the numbers as a table under the bars", () => {
    render(<BarChart data={[{ label: "May", values: [120, 30] }, { label: "Jun", values: [0, 60] }]} series={[{ name: "Received", className: "bg-primary" }, { name: "Paid", className: "bg-slate-400" }]} format={format} compact={format} ariaLabel="Money" emptyText="-" />);
    expect(screen.getByRole("img", { name: "Money" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Received" })).toBeInTheDocument();
    expect(screen.getAllByText("¥120").length).toBeGreaterThan(0);
    expect(screen.getByRole("cell", { name: "¥120" })).toBeInTheDocument();
  });

  it("lists items with their numbers", () => {
    render(<BarList rows={[{ key: "a", label: "Draft", value: 2 }, { key: "b", label: "Closed", value: 1, text: "one" }]} emptyText="none" />);
    expect(screen.getByText("Draft")).toBeInTheDocument();
    expect(screen.getByText("one")).toBeInTheDocument();
  });
});
