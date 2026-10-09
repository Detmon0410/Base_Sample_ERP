import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { mockUsers, toPublicUser } from "@/services/mock/users";

import { MainLayout } from "./MainLayout";

const renderLayout = (user = mockUsers[0]) =>
  render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated", logout: () => {} }}>
      <MemoryRouter initialEntries={["/orders"]}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="orders" element={<p>the page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe("where the menu is", () => {
  beforeEach(() => window.localStorage.removeItem("kanou.layout"));

  it("starts as a row in the bar at the top, with the sub-entries behind their menu", async () => {
    renderLayout();
    const menu = screen.getByRole("navigation", { name: "Main menu" });
    expect(menu.closest("header")).not.toBeNull();
    expect(within(menu).getByRole("button", { name: /Orders/ })).toBeInTheDocument();
    expect(within(menu).queryByRole("link", { name: "QT references" })).not.toBeInTheDocument();
  });

  it("moves to a list on the left with one button, shows every entry at once, and remembers the choice", async () => {
    const user = userEvent.setup();
    const first = renderLayout();
    await user.click(screen.getByRole("button", { name: "Menu on the left" }));

    const menu = screen.getByRole("navigation", { name: "Main menu" });
    expect(menu.closest("header")).toBeNull(); // no longer in the bar
    for (const name of ["Summary", "QT references", "Production orders", "Invoices", "Customers", "Products", "Stock", "Users"]) {
      expect(within(menu).getByRole("link", { name })).toBeInTheDocument();
    }
    expect(window.localStorage.getItem("kanou.layout")).toBe("side");

    // a new visit keeps the choice, and the same button brings the menu back
    first.unmount();
    renderLayout();
    expect(screen.getByRole("navigation", { name: "Main menu" }).closest("header")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Menu on top" }));
    expect(screen.getByRole("navigation", { name: "Main menu" }).closest("header")).not.toBeNull();
    expect(window.localStorage.getItem("kanou.layout")).toBe("top");
  });

  it("shows a Worker only the entries of a Worker in the list on the left", async () => {
    window.localStorage.setItem("kanou.layout", "side");
    renderLayout(mockUsers[1]);
    const menu = screen.getByRole("navigation", { name: "Main menu" });
    expect(within(menu).getAllByRole("link").map((link) => link.textContent)).toEqual(["Summary", "Production orders", "Products", "Stock"]);
  });
});
