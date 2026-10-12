import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { invoicesApi } from "@/services/invoices.service";
import { customersApi, materialsApi, productsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { todayIso } from "@/utils/dates";
import { setToken } from "@/utils/session";

import { DashboardPage } from "./DashboardPage";

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
const sectionOf = async (title) => (await screen.findByRole("heading", { name: title })).closest("section");

describe("the Dashboard", () => {
  it("shows an Admin the numbers, the two charts and the three lists, and a Worker the orders and the materials only", async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Dashboard Customer" });
    const product = await productsApi.create({ code: "DASH-P", name: "Fridge", price: 1 });
    const qt = await qtApi.create({ qtNumber: "QT-DASH", qtDate: "2026-10-01", customerId: customer.id, file: { name: "q.pdf", dataUrl: "data:application/pdf;base64,AA==" } });
    const make = () => ordersApi.create({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 4, unitPrice: 400, processes: [{ name: "Cut" }] }] });

    await make(); // New
    const running = await make();
    await ordersApi.start(running.id);
    await ordersApi.recordProgress(running.id, { processId: running.lines[0].processes[0].id, status: "In Progress", completedQuantity: 1, workDate: "2026-10-03", note: "" }); // 1 of 4: 25%
    const done = await make();
    await ordersApi.start(done.id);
    await ordersApi.recordProgress(done.id, { processId: done.lines[0].processes[0].id, status: "Completed", completedQuantity: 4, workDate: "2026-10-03", note: "" });
    const invoice = await invoicesApi.create({ orderId: done.id, invoiceDate: "2026-10-04" }); // Unpaid, 4 x 400
    await materialsApi.create({ code: "DASH-LOW", name: "Almost none", lots: [{ lotNumber: "L1", quantity: 2 }] });
    await materialsApi.create({ code: "DASH-HIGH", name: "Plenty", lots: [{ lotNumber: "L1", quantity: 900 }] });

    const admin = renderAs(mockUsers[0]);
    expect(await tile(/^New\s*1$/)).toHaveAttribute("href", "/sale/orders");
    expect(await tile(/^In progress\s*1$/)).toBeInTheDocument();
    expect(await tile(/^Completed\s*1$/)).toBeInTheDocument();
    expect(await tile(/^Unpaid invoices\s*1$/)).toHaveAttribute("href", "/accounting/invoices");
    expect(await tile(/^Unpaid total\s*¥1,600$/)).toBeInTheDocument();
    expect(await tile(/^Paid this month\s*¥0$/)).toBeInTheDocument();

    // the charts have their numbers as text
    expect(screen.getByRole("list", { name: "Production orders by status" })).toHaveTextContent("In progress1");
    expect(screen.getByRole("img", { name: /Invoiced and paid, last 6 months/ })).toBeInTheDocument();

    // the order in progress: its progress over all its processes, and a link to it
    const inProgress = await sectionOf("Orders in progress");
    expect(within(inProgress).getByRole("link", { name: running.orderNumber })).toHaveAttribute("href", `/sale/orders/${running.id}`);
    expect(inProgress).toHaveTextContent("25% (1 of 4)");

    // the unpaid invoice, and the material with the least stock first
    const unpaid = await sectionOf("Unpaid invoices, oldest first");
    expect(within(unpaid).getByRole("link", { name: invoice.invoiceNumber })).toBeInTheDocument();
    expect(unpaid).toHaveTextContent("¥1,600");
    const stock = await sectionOf("Materials with the least stock");
    const rows = within(stock).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("DASH-LOW");
    expect(stock).not.toHaveTextContent("minimum level is");
    admin.unmount();

    // a Worker: the orders and the materials, no money
    renderAs(mockUsers[1]);
    expect(await tile(/^New\s*1$/)).toBeInTheDocument();
    expect(screen.queryByText("Unpaid invoices")).not.toBeInTheDocument();
    expect(screen.queryByText("Paid this month")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Invoiced and paid/ })).not.toBeInTheDocument();
    expect(await sectionOf("Orders in progress")).toBeInTheDocument();
    expect(await sectionOf("Materials with the least stock")).toBeInTheDocument();
  });

  it("counts a payment of this month in the tile and in the last bar of the chart", async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Paid Customer" });
    const product = await productsApi.create({ code: "DASH-P2", name: "Fridge", price: 1 });
    const qt = await qtApi.create({ qtNumber: "QT-DASH2", qtDate: "2026-10-01", customerId: customer.id, file: { name: "q.pdf", dataUrl: "data:application/pdf;base64,AA==" } });
    const order = await ordersApi.create({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 1, unitPrice: 5000, processes: [{ name: "Cut" }] }] });
    await ordersApi.start(order.id);
    await ordersApi.recordProgress(order.id, { processId: order.lines[0].processes[0].id, status: "Completed", completedQuantity: 1, workDate: todayIso(), note: "" });
    const invoice = await invoicesApi.create({ orderId: order.id, invoiceDate: todayIso() });
    await invoicesApi.pay(invoice.id, { paymentDate: todayIso(), amount: 5000, method: "Cash", reference: "" });

    renderAs(mockUsers[0]);
    expect(await tile(/^Paid this month\s*¥5,000$/)).toBeInTheDocument();
    const chart = screen.getByRole("img", { name: /Invoiced and paid, last 6 months/ });
    expect(chart.getAttribute("aria-label")).toMatch(/Invoiced ¥6,600, Paid ¥5,000$/); // the current month is the last group; the invoice of the first test (¥1,600) is in it too
  });
});
