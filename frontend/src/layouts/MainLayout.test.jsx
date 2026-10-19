import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { mockUsers, toPublicUser } from "@/services/mock/users";

import { MainLayout } from "./MainLayout";

const renderLayout = (user = mockUsers[0], logout = () => { }) =>
  render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated", logout }}>
      <MemoryRouter initialEntries={["/sale/orders"]}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="sale/orders" element={<p>the page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe("the bar at the top", () => {
  it("has the menu in the bar, with the sub-entries behind their menu, and no sidebar and no button that moves the menu", async () => {
    renderLayout();
    const menu = screen.getByRole("navigation", { name: "Main menu" });
    expect(menu.closest("header")).not.toBeNull();
    expect(within(menu).getByRole("button", { name: /Sales/ })).toBeInTheDocument();
    expect(within(menu).queryByRole("link", { name: "Quotations" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Menu on the left|Menu on top/ })).not.toBeInTheDocument();
    expect(document.querySelector("aside")).toBeNull();
  });

  it("opens a menu with its entries, and shows an Admin every group", async () => {
    const user = userEvent.setup();
    renderLayout();
    const menu = screen.getByRole("navigation", { name: "Main menu" });
    expect(within(menu).getByRole("link", { name: "Accounting" })).toHaveAttribute("href", "/accounting"); // invoices and receipts are one page
    await user.click(within(menu).getByRole("button", { name: /Sales/ }));
    expect(within(menu).getByRole("link", { name: "Quotations" })).toBeInTheDocument();
    for (const group of [/Stock/, /Master data/]) expect(within(menu).getByRole("button", { name: group })).toBeInTheDocument();
  });

  it("shows a Worker only the entries of a Worker", async () => {
    renderLayout(mockUsers[1]);
    const menu = screen.getByRole("navigation", { name: "Main menu" });
    expect(within(menu).queryByRole("link", { name: "Accounting" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Production orders" })).toBeInTheDocument();
    expect(within(menu).getByRole("link", { name: "Purchase" })).toBeInTheDocument(); // a Factory Worker buys the materials
    expect(within(menu).getByRole("button", { name: /Master data/ })).toBeInTheDocument(); // products and suppliers, to look at
  });
});

describe("the user menu", () => {
  it("is the name of the user; it opens a list with who they are, the language and Log out, and Escape closes it", async () => {
    const user = userEvent.setup();
    renderLayout(mockUsers[1]);
    expect(screen.queryByRole("button", { name: "Log out" })).not.toBeInTheDocument(); // closed

    await user.click(screen.getByRole("button", { name: "Factory Worker" }));
    const panel = screen.getByRole("group", { name: "User menu" });
    expect(panel).toHaveTextContent("worker@gmail.com");
    expect(within(panel).getByText("Role").nextSibling).toHaveTextContent("Worker");
    expect(within(panel).getByText("Department").nextSibling).toHaveTextContent("Factory");
    expect(within(panel).getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    expect(within(panel).getByRole("button", { name: "日本語" })).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Log out" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("group", { name: "User menu" })).not.toBeInTheDocument();
  });

  it("changes the language of the screen, and Log out calls the sign-out", async () => {
    const user = userEvent.setup();
    const logout = vi.fn();
    renderLayout(mockUsers[0], logout);

    await user.click(screen.getByRole("button", { name: "Admin" }));
    await user.click(within(screen.getByRole("group", { name: "User menu" })).getByRole("button", { name: "日本語" }));
    expect(await screen.findByRole("link", { name: "ダッシュボード" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("group", { name: "ユーザーメニュー" })).getByRole("button", { name: "English" }));
    expect(await screen.findByRole("link", { name: "Dashboard" })).toBeInTheDocument();

    await user.click(within(screen.getByRole("group", { name: "User menu" })).getByRole("button", { name: "Log out" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
