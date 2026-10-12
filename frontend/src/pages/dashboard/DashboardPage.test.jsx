import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { customersApi, productsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { invoicesApi } from "@/services/invoices.service";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { setToken } from "@/utils/session";

import { SummaryPage } from "./SummaryPage";

const renderAs = (user) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter>
        <SummaryPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("the Summary page", () => {
  it("counts the orders by status and the unpaid invoices for an Admin, and shows a Worker the orders only", async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Summary Customer" });
    const product = await productsApi.create({ code: "SUM-P", name: "Fridge", price: 1 });
    const qt = await qtApi.create({ qtNumber: "QT-SUM", qtDate: "2026-10-01", customerId: customer.id, file: { name: "q.pdf", dataUrl: "data:application/pdf;base64,AA==" } });
    const make = () => ordersApi.create({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 2, unitPrice: 400, processes: [{ name: "Cut" }] }] });

    await make(); // New
    const running = await make();
    await ordersApi.start(running.id);
    await ordersApi.recordProgress(running.id, { processId: running.lines[0].processes[0].id, status: "In Progress", completedQuantity: 1, workDate: "2026-10-03", note: "" }); // In Progress
    const done = await make();
    await ordersApi.start(done.id);
    await ordersApi.recordProgress(done.id, { processId: done.lines[0].processes[0].id, status: "Completed", completedQuantity: 2, workDate: "2026-10-03", note: "" });
    await invoicesApi.create({ orderId: done.id, invoiceDate: "2026-10-04" }); // Completed, one Unpaid invoice of ¥800

    const admin = renderAs(mockUsers[0]);
    const tile = async (label) => (await screen.findByText(label)).parentElement;
    expect(await tile("New")).toHaveTextContent("1");
    expect(await tile("In progress")).toHaveTextContent("1");
    expect(await tile("Completed")).toHaveTextContent("1");
    expect(await tile("Unpaid invoices")).toHaveTextContent("1");
    expect(await tile("Unpaid total")).toHaveTextContent("¥800");
    admin.unmount();

    renderAs(mockUsers[1]);
    expect(await tile("New")).toHaveTextContent("1");
    expect(screen.queryByText("Unpaid invoices")).not.toBeInTheDocument();
  });
});
