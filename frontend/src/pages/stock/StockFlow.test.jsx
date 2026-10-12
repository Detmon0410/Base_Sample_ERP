import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { materialsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { setToken } from "@/utils/session";

import { StockPage } from "./StockPage";

// The stock page of a material, driven like a person would, on the mock (step 8 of the workflow).

const renderAs = (user, path) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/stock/materials/*" element={<StockPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("stock changes, page by page", () => {
  it("an Admin adds, deducts and adjusts; a change below zero is refused; the history keeps every change", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    const material = await materialsApi.create({ code: "FLOW-M", name: "Flow steel", lots: [{ lotNumber: "A1", quantity: 10 }] });
    renderAs(mockUsers[0], `/stock/materials/${material.id}`);

    const lots = (await screen.findByRole("heading", { name: "Lots and quantities" })).closest("section");
    expect(within(lots).getByRole("row", { name: /A1/ })).toHaveTextContent("10");

    // a new lot
    await user.selectOptions(screen.getByLabelText("Lot"), "A new lot");
    await user.type(screen.getByLabelText("New lot number"), "B2");
    await user.type(screen.getByLabelText("Quantity"), "5");
    await user.click(screen.getByRole("button", { name: "Save the change" }));
    await waitFor(() => expect(within(lots).getByRole("row", { name: /B2/ })).toHaveTextContent("5"));

    // deducting more than the lot has is refused
    await user.selectOptions(screen.getByLabelText("Type"), "Deduct (used)");
    await user.selectOptions(screen.getByLabelText("Lot"), "B2 (5)");
    await user.type(screen.getByLabelText("Quantity"), "6");
    await user.click(screen.getByRole("button", { name: "Save the change" }));
    expect(await screen.findByText("This change would make the lot negative.")).toBeInTheDocument();
    expect(within(lots).getByRole("row", { name: /B2/ })).toHaveTextContent("5");

    // 2 is fine
    const quantity = screen.getByLabelText("Quantity");
    await user.clear(quantity);
    await user.type(quantity, "2");
    await user.click(screen.getByRole("button", { name: "Save the change" }));
    await waitFor(() => expect(within(lots).getByRole("row", { name: /B2/ })).toHaveTextContent("3"));

    // an adjustment needs a note
    await user.selectOptions(screen.getByLabelText("Type"), "Adjust after a count");
    await user.selectOptions(screen.getByLabelText("Lot"), "A1 (10)");
    await user.type(screen.getByLabelText("Quantity"), "-1");
    await user.click(screen.getByRole("button", { name: "Save the change" }));
    expect((await screen.findAllByText("Enter or choose a value.")).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText("Note"), "October count");
    await user.click(screen.getByRole("button", { name: "Save the change" }));
    await waitFor(() => expect(within(lots).getByRole("row", { name: /A1/ })).toHaveTextContent("9"));

    // the history: the first Add of the material, then the three changes, newest first
    const history = screen.getByRole("heading", { name: "Stock history" }).closest("section");
    await waitFor(() => expect(within(history).getAllByRole("row")).toHaveLength(5));
    const rows = within(history).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Adjust after a count");
    expect(rows[1]).toHaveTextContent("-1");
    expect(rows[1]).toHaveTextContent("October count");
    expect(rows[4]).toHaveTextContent("Initial stock");
  });

  it("shows a Worker the lots and the history, without the form", async () => {
    setToken(tokenOf(mockUsers[0]));
    const material = await materialsApi.create({ code: "FLOW-W", name: "For the Worker", lots: [{ lotNumber: "W1", quantity: 4 }] });
    renderAs(mockUsers[1], `/stock/materials/${material.id}`);
    await screen.findByRole("heading", { name: "Stock history" });
    expect(screen.queryByRole("button", { name: "Save the change" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  });
});
