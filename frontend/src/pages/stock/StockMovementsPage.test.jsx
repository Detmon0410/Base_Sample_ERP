import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { materialsApi, stockApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { setToken } from "@/utils/session";

import { StockMovementsPage } from "./StockMovementsPage";

// The movements page, driven like a person would: the ledger of every material, the filters, and a click on a row.

const renderAs = (user) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={["/stock/movements"]}>
        <Routes>
          <Route path="/stock/movements" element={<StockMovementsPage />} />
          <Route path="/stock/materials/:id" element={<p>the page of a material</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("the stock movements page", () => {
  it("shows the changes of every material, filters them, and opens the material with a click on a row", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    const steel = await materialsApi.create({ code: "PG-STEEL", name: "Steel", lots: [{ lotNumber: "S1", quantity: 50 }] });
    await materialsApi.create({ code: "PG-FOAM", name: "Foam", lots: [{ lotNumber: "F1", quantity: 9 }] });
    await stockApi.change(steel.id, { kind: "Deduct", lotNumber: "S1", quantity: 8, changeDate: "2026-10-04", note: "Cutting for the first order" });

    renderAs(mockUsers[0]);
    const table = await screen.findByRole("table");
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(4)); // the header, two first stocks and one deduction
    const deduct = within(table).getByRole("row", { name: /Cutting for the first order/ });
    expect(deduct).toHaveTextContent("PG-STEEL");
    expect(deduct).toHaveTextContent("Deduct (used)");
    expect(deduct).toHaveTextContent("-8");
    expect(deduct).toHaveTextContent("42"); // the balance of the lot after it

    // the type filter, then the search
    await user.selectOptions(screen.getByLabelText("Type"), "Deduct (used)");
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(2));
    await user.selectOptions(screen.getByLabelText("Type"), "All");
    await user.type(screen.getByLabelText("Search (material, lot, order, note)"), "foam");
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(2));
    expect(within(table).getByRole("row", { name: /PG-FOAM/ })).toBeInTheDocument();

    // the dates: only a typed date that has the shape of a date is used
    await user.clear(screen.getByLabelText("Search (material, lot, order, note)"));
    await user.type(screen.getByLabelText("From (YYYY-MM-DD)"), "2026-10-04");
    await user.type(screen.getByLabelText("To (YYYY-MM-DD)"), "2026-10-04");
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(2)); // the deduction of that day only

    // a click on a cell that is not a link opens the material
    await user.click(within(table).getByText("Cutting for the first order"));
    expect(await screen.findByText("the page of a material")).toBeInTheDocument();
  });

  it("says so when nothing matches, and is open to a Worker", async () => {
    const user = userEvent.setup();
    renderAs(mockUsers[1]);
    await screen.findByRole("table");
    await user.type(screen.getByLabelText("Search (material, lot, order, note)"), "no such thing at all");
    expect(await screen.findByText("No stock change matches.")).toBeInTheDocument();
  });
});
