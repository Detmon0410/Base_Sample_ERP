import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { CustomersPage } from "@/pages/master/CustomersPage";
import { customersApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { setToken } from "@/utils/session";

// The rows of a list: a click on any cell opens the record; the rows alternate in colour.

const renderList = () => {
  setToken(tokenOf(mockUsers[0]));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(mockUsers[0]), status: "authenticated" }}>
      <MemoryRouter initialEntries={["/customers"]}>
        <Routes>
          <Route path="/customers/*" element={<CustomersPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("a list of records", () => {
  it("opens a record with a click on any cell of its row, not only on the first one", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    await customersApi.create({ name: "Row Customer", address: "1 Row Street", email: "row@x.jp", telephone: "03" });
    renderList();

    await user.click(await screen.findByText("row@x.jp")); // the e-mail cell, not the link
    expect(await screen.findByLabelText("Name")).toHaveValue("Row Customer");
  });

  it("opens a record with the link of the first cell too, and shows a pointer and alternating colours on the rows", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    await customersApi.create({ name: "Second Customer" });
    renderList();

    await screen.findByRole("link", { name: "Second Customer" });
    await waitFor(() => expect(screen.getAllByRole("row").length).toBeGreaterThanOrEqual(3)); // the header and two customers
    const rows = screen.getAllByRole("row").slice(1); // without the header
    for (const row of rows) {
      expect(row.className).toContain("cursor-pointer");
      expect(row.className).toContain("odd:bg-card");
      expect(row.className).toContain("even:bg-");
    }
    await user.click(screen.getByRole("link", { name: "Second Customer" }));
    expect(await screen.findByLabelText("Name")).toHaveValue("Second Customer");
  });
});
