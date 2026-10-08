import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { CardList } from "@/components/common/CardList";

const columns = [
  { key: "name", header: "Name", sortable: true },
  { key: "city", header: "City" },
  { key: "note", header: "Note", secondary: true },
  { key: "status", header: "Status", render: (row) => <b>{row.status}</b> },
];
const rows = [{ id: 1, name: "Acme", city: "Osaka", note: "hidden note", status: "Active" }];

const renderList = (props) =>
  render(
    <MemoryRouter>
      <CardList columns={columns} rows={rows} rowKey={(row) => row.id} rowTo={(row) => `/x/${row.id}`} status="success" total={1} {...props} />
    </MemoryRouter>,
  );

describe("CardList", () => {
  it("shows the first column as the title, the status, and the other columns as lines", () => {
    renderList();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/x/1");
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("City")).toBeInTheDocument();
    expect(screen.getByText("Osaka")).toBeInTheDocument();
  });

  it("leaves out secondary columns", () => {
    renderList();
    expect(screen.queryByText("hidden note")).not.toBeInTheDocument();
  });

  it("shows a red dot for a new row and marks it on click", () => {
    const mark = vi.fn();
    renderList({ isNew: () => true, mark });
    expect(screen.getByRole("img")).toBeInTheDocument();
    screen.getByRole("link").click();
    expect(mark).toHaveBeenCalledWith("/x/1");
  });

  it("shows the empty content when there are no rows", () => {
    renderList({ rows: [], emptyContent: "Nothing here" });
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
