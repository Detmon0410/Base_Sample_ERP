import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { customersApi, materialsApi, productsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { ordersApi } from "@/services/orders.service";
import { purchaseApi } from "@/services/purchase.service";
import { suppliersApi } from "@/services/suppliers.service";
import { setToken } from "@/utils/session";
import { makeOrder } from "@/test/orders";

import { HomePage } from "./HomePage";

// The first page: a Factory Worker starts from the work of today (start, record progress, receive), the others from the Dashboard.

const renderAs = (user) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<p>another page</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("the first page", () => {
  let order;

  beforeAll(async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Today Customer" });
    const product = await productsApi.create({ code: "TD-P", name: "Today fridge", price: 100, bom: [] });
    order = await makeOrder({ customerId: customer.id, lines: [{ productId: product.id, quantity: 5, unitPrice: 100, processes: [{ name: "Welding" }, { name: "Painting" }] }] });
    const steel = await materialsApi.create({ code: "TD-STEEL", name: "Today steel", unit: "kg", minLevel: 50, lots: [{ lotNumber: "T1", quantity: 5 }] }); // Low
    const supplier = await suppliersApi.create({ code: "TD-SUP", name: "Today Supplier", active: true, items: [{ materialId: steel.id, unitPrice: 300 }] });
    const po = await purchaseApi.create({ supplierId: supplier.id, requiredDate: "2026-11-01", department: "Factory", lines: [{ materialId: steel.id, quantity: 10, unitPrice: 300 }] });
    await purchaseApi.setStatus(po.id, { status: "Sent" });
  });

  it("shows a Factory Worker the work of today: start an order, record the next process, the PO to receive and the low stock", async () => {
    const user = userEvent.setup();
    renderAs(mockUsers[1]);

    expect(await screen.findByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    expect(await screen.findByText("1 material is low or out")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Receive: PO-/ })).toBeInTheDocument();

    // to start: the order, with one big button; the start asks first
    const toStart = screen.getByRole("heading", { name: /^To start/ }).closest("section");
    const card = await within(toStart).findByRole("article");
    expect(card).toHaveTextContent(order.orderNumber);
    expect(card).toHaveTextContent("Today Customer");
    await user.click(within(card).getByRole("button", { name: "Start production" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));

    // in production: the next process, and the progress is recorded on the card
    const running = screen.getByRole("heading", { name: /^In production/ }).closest("section");
    const mine = await within(running).findByRole("article");
    expect(mine).toHaveTextContent("1. Welding");
    await user.click(within(mine).getByRole("button", { name: /Record progress: .*Welding/ }));
    await user.selectOptions(within(mine).getByLabelText("Status"), "Completed");
    const quantity = within(mine).getByLabelText(/^Completed quantity/);
    await user.clear(quantity);
    await user.type(quantity, "5");
    await user.click(within(mine).getByRole("button", { name: "Save progress" }));

    // the next process is Painting now
    await waitFor(() => expect(within(running).getByRole("button", { name: /Record progress: .*Painting/ })).toBeInTheDocument());
    const done = (await ordersApi.get(order.id)).lines[0].processes[0];
    expect(done).toMatchObject({ name: "Welding", status: "Completed", completedQuantity: 5 });
  });

  it("opens the Dashboard for a Sale Worker and for the Admin, not the work of today", async () => {
    const sale = renderAs(mockUsers[2]);
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^To start/ })).not.toBeInTheDocument();
    sale.unmount();
    renderAs(mockUsers[0]);
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });
});
