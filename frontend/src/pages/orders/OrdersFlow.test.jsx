import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { invoicesApi } from "@/services/invoices.service";
import { ordersApi } from "@/services/orders.service";
import { customersApi, materialsApi, productsApi } from "@/services/master.service";
import { mockUsers, tokenOf, toPublicUser } from "@/services/mock/users";
import { qtApi } from "@/services/qt.service";
import { setToken } from "@/utils/session";

import { OrdersPage } from "./OrdersPage";
import { makeOrder } from "@/test/orders";

// The pages of the production orders, driven like a person would, on the mock (steps 2-5 of the workflow).

const renderAs = (user, path) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/sale/orders/*" element={<OrdersPage />} />
          <Route path="/403" element={<p>forbidden</p>} />
          <Route path="/sale/quotations" element={<p>the quotations</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("production orders, page by page", () => {
  let flow; // the order of a confirmed QT, with no process yet (made by Confirm QT)

  beforeAll(async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Flow Customer" });
    const product = await productsApi.create({ code: "FLOW-P", name: "Flow fridge", price: 5000 });
    const qt = await qtApi.create({ qtNumber: "QT-FLOW", qtDate: "2026-10-01", customerId: customer.id, customerPoNumber: "PO-FLOW", lines: [{ productId: product.id, quantity: 10, unitPrice: 5000 }] });
    flow = (await qtApi.confirm(qt.id)).order;
  });

  it("shows the BOM of the product beside the processes, for the quantity, without a warning when the material is out and with nothing to add", async () => {
    const material = await materialsApi.create({ code: "MAT-OUT", name: "Steel sheet" }); // no lot: nothing in stock
    const product = await productsApi.create({ code: "BOM-P", name: "Bom fridge", price: 100, bom: [{ materialId: material.id, quantity: 2 }] });
    const customer = await customersApi.create({ name: "Bom Customer" });
    const order = await makeOrder({ customerId: customer.id, lines: [{ productId: product.id, quantity: 10, unitPrice: 100, processes: [] }] });
    renderAs(mockUsers[2], `/sale/orders/${order.id}`); // a Sale Worker prepares the order

    expect(await screen.findByRole("heading", { name: "Materials (BOM)" })).toBeInTheDocument();
    const row = await screen.findByRole("row", { name: /MAT-OUT Steel sheet/ });
    expect(row).toHaveTextContent("20"); // 2 for one product x 10
    expect(screen.queryByRole("alert")).not.toBeInTheDocument(); // the material is out of stock, and nothing is said
    expect(screen.queryByRole("button", { name: /material/i })).not.toBeInTheDocument(); // nothing to add to the BOM here
  });

  it("a Sale Worker adds the process to the order of a QT, an Admin starts it, and a Factory Worker completes it", async () => {
    const user = userEvent.setup();
    const sale = renderAs(mockUsers[2], `/sale/orders/${flow.id}`);

    // the order came from the QT: its QT, customer and customer PO are shown, and the product and the quantity are the QT's
    expect(await screen.findByText("Flow Customer")).toBeInTheDocument();
    expect(screen.getByText("QT-FLOW")).toBeInTheDocument();
    expect(screen.getByText("PO-FLOW")).toBeInTheDocument();
    expect(await screen.findByLabelText("Quantity")).toHaveValue(10);
    expect(screen.getByLabelText("Agreed unit price")).toHaveValue(5000);
    await user.click(screen.getByRole("button", { name: "Add a process" }));
    await user.type(screen.getByLabelText("Process"), "Cutting");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // after Save the list opens, with the order as a Draft
    const link = await screen.findByRole("link", { name: flow.orderNumber });
    expect(screen.getByRole("row", { name: new RegExp(flow.orderNumber) })).toHaveTextContent("Draft");
    expect(screen.queryByRole("link", { name: /New production order/ })).not.toBeInTheDocument(); // an order is made by Confirm QT
    sale.unmount();

    // the Admin starts it
    const admin = renderAs(mockUsers[0], `/sale/orders/${flow.id}`);
    await user.click(await screen.findByRole("button", { name: "Start production" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("Not started")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Draft"); // no process has started yet
    expect(screen.getByText("Production started")).toBeInTheDocument(); // so a started order is not taken for a draft that waits
    const orderPath = `/sale/orders/${link.getAttribute("href").split("/").pop()}`;
    admin.unmount();

    // a Factory Worker records progress, 4 then all 10
    renderAs(mockUsers[1], orderPath);
    await user.click(await screen.findByRole("button", { name: "Record progress" }));
    await user.selectOptions(screen.getByLabelText("Status"), "In progress");
    const quantity = screen.getByLabelText("Completed quantity (total so far)");
    await user.clear(quantity);
    await user.type(quantity, "4");
    await user.click(screen.getByRole("button", { name: "Save progress" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Save progress" })).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Record progress" }));
    await user.selectOptions(screen.getByLabelText("Status"), "Completed");
    const again = screen.getByLabelText("Completed quantity (total so far)");
    await user.clear(again);
    await user.type(again, "9");
    await user.click(screen.getByRole("button", { name: "Save progress" }));
    expect(await screen.findByText("A completed process must have the full quantity.")).toBeInTheDocument();
    await user.clear(again);
    await user.type(again, "10");
    await user.click(screen.getByRole("button", { name: "Save progress" }));

    // every process is completed: the order is Completed, and the history keeps both updates
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Completed"));
    const history = screen.getByRole("heading", { name: "Progress history" }).closest("section");
    expect(within(history).getAllByRole("row")).toHaveLength(3); // the header and two updates
    expect(screen.queryByRole("button", { name: "Record progress" })).not.toBeInTheDocument(); // a Worker cannot reopen
  });

  it("has no new order: the old address opens the quotations, where an order is made by Confirm QT", async () => {
    renderAs(mockUsers[2], "/sale/orders/new");
    expect(await screen.findByText("the quotations")).toBeInTheDocument();
  });

  it("says which material is short when the start is refused, with a button that opens it ready to add the missing quantity", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0])); // the tests before this one signed in as a Worker
    const material = await materialsApi.create({ code: "MAT-SHORT", name: "Short steel", lots: [{ lotNumber: "S1", quantity: 5 }] });
    const product = await productsApi.create({ code: "SHORT-P", name: "Short fridge", price: 100, bom: [{ materialId: material.id, quantity: 2 }] });
    const customer = await customersApi.create({ name: "Short Customer" });
    const qt = await qtApi.create({ qtNumber: "QT-SHORT", qtDate: "2026-10-01", customerId: customer.id });
    const order = await makeOrder({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 10, unitPrice: 100, processes: [{ name: "Cut", instructions: "" }] }] });
    renderAs(mockUsers[0], `/sale/orders/${order.id}`);

    await user.click(await screen.findByRole("button", { name: "Start production" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/MAT-SHORT Short steel: needs 20, in stock 5\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add stock" })).toHaveAttribute("href", `/stock/materials/${material.id}?add=15&order=${order.id}`);
    expect(screen.getByRole("button", { name: "Start production" })).toBeInTheDocument(); // it did not start
  });

  it("lets a Sale Worker prepare an order and a Factory Worker start it", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    const product = await productsApi.create({ code: "ROLE-P", name: "Role fridge", price: 100 }); // no BOM: nothing to deduct
    const customer = await customersApi.create({ name: "Role Customer" });
    const qt = await qtApi.create({ qtNumber: "QT-ROLE", qtDate: "2026-10-01", customerId: customer.id });
    const order = await makeOrder({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 2, unitPrice: 100, processes: [{ name: "Cut", instructions: "" }] }] });

    // the Sale Worker: the form of the order (to change it), and no Start
    const sale = renderAs(mockUsers[2], `/sale/orders/${order.id}`);
    expect(await screen.findByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start production" })).not.toBeInTheDocument();
    sale.unmount();

    // the Factory Worker: the page of the order, with Start (and no way to change the products and the processes)
    renderAs(mockUsers[1], `/sale/orders/${order.id}`);
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Start production" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Start production" })).not.toBeInTheDocument()); // it started
  });
});

describe("an invoiced order", () => {
  it("offers no Record progress or Reopen, not even to the Admin (the server would refuse with ORDER_INVOICED)", async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Invoiced Customer" });
    const product = await productsApi.create({ code: "INVD-P", name: "Invoiced fridge", price: 10, bom: [] });
    const order = await makeOrder({ customerId: customer.id, lines: [{ productId: product.id, quantity: 2, unitPrice: 10, processes: [{ name: "Only step" }] }] });
    await ordersApi.start(order.id);
    await ordersApi.recordProgress(order.id, { processId: order.lines[0].processes[0].id, status: "Completed", completedQuantity: 2, workDate: "2026-10-05", note: "" });
    renderAs(mockUsers[0], `/sale/orders/${order.id}`);
    expect((await screen.findAllByRole("row", { name: /Only step/ })).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Reopen" })).toBeInTheDocument(); // not invoiced yet: the Admin may reopen

    setToken(tokenOf(mockUsers[0]));
    await invoicesApi.create({ orderId: order.id, invoiceDate: "2026-10-06" });
    cleanup();
    renderAs(mockUsers[0], `/sale/orders/${order.id}`);
    expect((await screen.findAllByRole("row", { name: /Only step/ })).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Reopen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record progress" })).not.toBeInTheDocument();
  });
});
