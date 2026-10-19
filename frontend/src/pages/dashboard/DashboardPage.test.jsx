import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { invoicesApi } from "@/services/invoices.service";
import { customersApi, productsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { todayIso } from "@/utils/dates";
import { setToken } from "@/utils/session";

import { DashboardPage } from "./DashboardPage";
import { makeOrder } from "@/test/orders";

const renderAs = (user) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

const tile = (name) => screen.findByRole("link", { name });

describe("the Dashboard", () => {
  it("shows an Admin the numbers and the chart of the orders, and a Worker the numbers of the orders only", async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Dashboard Customer" });
    const product = await productsApi.create({ code: "DASH-P", name: "Fridge", price: 1 });
    const qt = await qtApi.create({ qtNumber: "QT-DASH", qtDate: "2026-10-01", customerId: customer.id, file: { name: "q.pdf", dataUrl: "data:application/pdf;base64,AA==" } });
    const make = () => makeOrder({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 4, unitPrice: 400, processes: [{ name: "Cut" }] }] });

    await make(); // Draft
    const running = await make();
    await ordersApi.start(running.id);
    await ordersApi.recordProgress(running.id, { processId: running.lines[0].processes[0].id, status: "In Progress", completedQuantity: 1, workDate: "2026-10-03", note: "" }); // 1 of 4: 25%
    const done = await make();
    await ordersApi.start(done.id);
    await ordersApi.recordProgress(done.id, { processId: done.lines[0].processes[0].id, status: "Completed", completedQuantity: 4, workDate: "2026-10-03", note: "" });
    await invoicesApi.create({ orderId: done.id, invoiceDate: "2026-10-04" }); // Unpaid, 4 x 400

    const admin = renderAs(mockUsers[0]);
    expect(await tile(/^Draft\s*1$/)).toHaveAttribute("href", "/sale/orders");
    expect(await tile(/^In progress\s*1$/)).toBeInTheDocument();
    expect(await tile(/^Completed\s*1$/)).toBeInTheDocument();
    expect(await tile(/^Unpaid invoices\s*1$/)).toHaveAttribute("href", "/accounting");
    expect(await tile(/^Unpaid total\s*¥1,600$/)).toBeInTheDocument();
    expect(await tile(/^Paid this month\s*¥0$/)).toBeInTheDocument();

    // the chart has its numbers as text
    expect(screen.getByRole("list", { name: "Production orders by status" })).toHaveTextContent("In progress1");

    admin.unmount();

    // a Worker: the orders, no money and no chart
    renderAs(mockUsers[1]);
    expect(await tile(/^Draft\s*1$/)).toBeInTheDocument();
    expect(screen.queryByText("Unpaid invoices")).not.toBeInTheDocument();
    expect(screen.queryByText("Paid this month")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Production orders by status" })).not.toBeInTheDocument();
  });

  it("counts a payment of this month in the tile", async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Paid Customer" });
    const product = await productsApi.create({ code: "DASH-P2", name: "Fridge", price: 1 });
    const qt = await qtApi.create({ qtNumber: "QT-DASH2", qtDate: "2026-10-01", customerId: customer.id, file: { name: "q.pdf", dataUrl: "data:application/pdf;base64,AA==" } });
    const order = await makeOrder({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 1, unitPrice: 5000, processes: [{ name: "Cut" }] }] });
    await ordersApi.start(order.id);
    await ordersApi.recordProgress(order.id, { processId: order.lines[0].processes[0].id, status: "Completed", completedQuantity: 1, workDate: todayIso(), note: "" });
    const invoice = await invoicesApi.create({ orderId: order.id, invoiceDate: todayIso() });
    await invoicesApi.pay(invoice.id, { paymentDate: todayIso(), amount: 5000 });

    renderAs(mockUsers[0]);
    expect(await tile(/^Paid this month\s*¥5,000$/)).toBeInTheDocument();
  });
});
