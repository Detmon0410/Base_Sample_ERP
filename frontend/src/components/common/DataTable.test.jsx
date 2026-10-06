import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import { DataTable } from "./DataTable";

const columns = [
  { key: "number", header: "No.", sortable: true },
  { key: "customer", header: "Customer" },
  { key: "total", header: "Total", align: "right", sortable: true, render: (row) => `¥${row.total}`, sum: (value) => `¥${value}` },
  { key: "status", header: "Status" },
];
const rows = [
  { id: 1, number: "QT-1", customer: "ABC", total: 100, status: "draft" },
  { id: 2, number: "QT-2", customer: "XYZ", total: 250, status: "sent" },
];

const show = (props) =>
  render(
    <MemoryRouter>
      <DataTable ariaLabel="Quotations" columns={columns} rows={rows} sort="number" onSortChange={() => {}} status="ready" {...props} />
    </MemoryRouter>,
  );

describe("DataTable", () => {
  it("shows a row per record", () => {
    show();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2
    expect(screen.getByText("QT-2")).toBeInTheDocument();
  });

  it("ends with the total number of items and the sum under the column that has one", () => {
    show({ total: 12, sums: { total: 9876 } });
    const footer = screen.getAllByRole("row").at(-1);
    expect(within(footer).getByText("Total 12 items")).toBeInTheDocument();
    expect(within(footer).getByText("¥9876")).toBeInTheDocument();
    // the label covers the columns before the first sum
    expect(within(footer).getByText("Total 12 items")).toHaveAttribute("colspan", "2");
  });

  it("shows only the count when no column has a sum", () => {
    show({ total: 2 });
    const footer = screen.getAllByRole("row").at(-1);
    expect(within(footer).getByText("Total 2 items")).toHaveAttribute("colspan", "4");
  });

  it("has no summary row while loading or when there is nothing to show", () => {
    show({ total: 5, status: "loading" });
    expect(screen.queryByText("Total 5 items")).not.toBeInTheDocument();
  });

  it("shows the empty content when there are no rows", () => {
    show({ rows: [], total: 0, emptyContent: <p>Nothing here</p> });
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.queryByText("Total 0 items")).not.toBeInTheDocument();
  });

  it("sorts by the clicked column", async () => {
    const onSortChange = vi.fn();
    show({ onSortChange });
    await userEvent.click(screen.getByRole("button", { name: /Total/ }));
    expect(onSortChange).toHaveBeenCalledWith("total");
  });
});
