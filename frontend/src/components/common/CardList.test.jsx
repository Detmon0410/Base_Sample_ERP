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

  it("never puts a link inside a link when a cell holds a link of its own", () => {
    const withLink = [{ key: "name", header: "Name", render: (row) => <a href={`/other/${row.id}`}>{row.name}</a> }, ...columns.slice(1)];
    const { container } = renderList({ columns: withLink });
    expect(container.querySelectorAll("a a")).toHaveLength(0);
    expect(screen.getAllByRole("link")).toHaveLength(2); // the card, and the link of the cell
    expect(screen.getAllByRole("link").map((link) => link.getAttribute("href")).sort()).toEqual(["/other/1", "/x/1"]);
  });
});
