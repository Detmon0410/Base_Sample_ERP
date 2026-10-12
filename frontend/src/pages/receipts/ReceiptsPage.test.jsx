import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { invoicesApi } from "@/services/invoices.service";
import { customersApi, productsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { todayIso } from "@/utils/dates";
import { setToken } from "@/utils/session";

import { ReceiptsPage } from "./ReceiptsPage";

// The receipts, driven like a person would: the list of every receipt, the search, a click on a row, and no way to make or change one.

describe("the receipts pages", () => {
  it("lists the receipts, finds one, and opens it with a click on any cell of its row", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    const product = await productsApi.create({ code: "RC-P", name: "Fridge", price: 1 });
    const pay = async (name, price) => {
      const customer = await customersApi.create({ name, address: "Somewhere" });
      const qt = await qtApi.create({ qtNumber: `QT-${name}`, qtDate: todayIso(), customerId: customer.id, file: { name: "q.pdf", dataUrl: "data:application/pdf;base64,AA==" } });
      const order = await ordersApi.create({ qtId: qt.id, customerId: customer.id, orderDate: todayIso(), lines: [{ productId: product.id, quantity: 1, unitPrice: price, processes: [{ name: "Cut" }] }] });
      await ordersApi.start(order.id);
      await ordersApi.recordProgress(order.id, { processId: order.lines[0].processes[0].id, status: "Completed", completedQuantity: 1, workDate: todayIso(), note: "" });
      const invoice = await invoicesApi.create({ orderId: order.id, invoiceDate: todayIso() });
      return invoicesApi.pay(invoice.id, { paymentDate: todayIso(), amount: price, method: "Cheque", reference: "" });
    };
    await pay("Alpha Foods", 1000);
    await pay("Beta Cold", 2500);

    render(
      <AuthContext.Provider value={{ user: toPublicUser(mockUsers[0]), status: "authenticated" }}>
        <MemoryRouter initialEntries={["/receipts"]}>
          <Routes>
            <Route path="/receipts/*" element={<ReceiptsPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    expect(await screen.findByRole("heading", { level: 1, name: "Receipts" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^New/ })).not.toBeInTheDocument(); // a receipt is made by a payment, not here
    const table = await screen.findByRole("table");
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(3));
    const beta = within(table).getByRole("row", { name: /Beta Cold/ });
    expect(beta).toHaveTextContent("¥2,500");
    expect(beta).toHaveTextContent("Cheque");

    await user.type(screen.getByLabelText("Search"), "alpha");
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(2));
    await user.click(within(table).getByText("Alpha Foods")); // a cell that is not the link
    expect(await screen.findByRole("heading", { level: 2, name: "Receipt" })).toBeInTheDocument();
    expect(screen.getByText(/^Amount received: ¥1,000$/)).toBeInTheDocument();
  });
});
