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
    await ordersApi.start(order.id);
  });

  it("shows a Factory Worker the work of today: record the next process, the PO to receive and the low stock", async () => {
    const user = userEvent.setup();
    renderAs(mockUsers[1]);

    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    // the numbers of the orders come first, as tiles
    expect(await screen.findByRole("link", { name: /^Draft\s*\d+$/ })).toHaveAttribute("href", "/sale/orders");
    expect(await screen.findByText("1 material is low or out")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buy" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Receive: PO-/ })).toBeInTheDocument();

    // there is no "To start" group: the start is on the page of the order
    expect(screen.queryByRole("heading", { name: /^To start/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start production" })).not.toBeInTheDocument();

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

  it("opens the plain Dashboard (no work cards) for a Sale Worker and for the Admin", async () => {
    const sale = renderAs(mockUsers[2]);
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^To start/ })).not.toBeInTheDocument();
    sale.unmount();
    renderAs(mockUsers[0]);
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });
});

describe("the work of today, with many orders", () => {
  it("shows an order in production even when many newer orders have not started", async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Many Customer" });
    const product = await productsApi.create({ code: "MANY-P", name: "Many fridge", price: 1, bom: [] });
    const old = await makeOrder({ customerId: customer.id, lines: [{ productId: product.id, quantity: 1, unitPrice: 1, processes: [{ name: "Oldest process" }] }] });
    await ordersApi.start(old.id);
    for (let index = 0; index < 25; index += 1) await makeOrder({ customerId: customer.id, lines: [{ productId: product.id, quantity: 1, unitPrice: 1, processes: [{ name: "Waiting" }] }] }); // newer, not started
    renderAs(mockUsers[1]);
    expect(await screen.findByText(old.orderNumber)).toBeInTheDocument();
    expect(screen.getByText("1. Oldest process")).toBeInTheDocument();
  }, 30000);
});
