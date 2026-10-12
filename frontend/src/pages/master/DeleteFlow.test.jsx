import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { customersApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { productsApi } from "@/services/master.service";
import { setToken } from "@/utils/session";

import { CustomersPage } from "./CustomersPage";

// The delete of a record, driven like a person would: a confirmation, a refusal that says where the record is used, and a delete.

const renderAs = (user, path) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/customers/*" element={<CustomersPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("deleting a customer", () => {
  it("refuses a customer that is used and says where, then deletes one that is free", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    const used = await customersApi.create({ name: "Used Customer" });
    const free = await customersApi.create({ name: "Free Customer" });
    const qt = await qtApi.create({ qtNumber: "QT-DELUI", qtDate: "2026-10-01", customerId: used.id, file: { name: "q.pdf", dataUrl: "data:application/pdf;base64,AA==" } });
    const product = await productsApi.create({ code: "DELUI-P", name: "P", price: 1 });
    const order = await ordersApi.create({ qtId: qt.id, customerId: used.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 1, unitPrice: 1, processes: [] }] });

    // the used customer: the confirmation names it, then the refusal lists the QT reference and the order
    const first = renderAs(mockUsers[0], `/customers/${used.id}`);
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    expect(await screen.findByText('"Used Customer" will be deleted for good. This cannot be undone.')).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("This record cannot be deleted because it is still used:")).toBeInTheDocument();
    expect(screen.getByText("QT references: QT-DELUI")).toBeInTheDocument();
    expect(screen.getByText(`Production orders: ${order.orderNumber}`)).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveValue("Used Customer"); // still there
    first.unmount();

    // the free customer: deleted, and the list opens without it
    renderAs(mockUsers[0], `/customers/${free.id}`);
    await user.click(await screen.findByRole("button", { name: "Delete" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.getByRole("link", { name: "Used Customer" })).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: "Free Customer" })).not.toBeInTheDocument();
  });

  it("has no Delete on a new record", async () => {
    renderAs(mockUsers[0], "/customers/new");
    await screen.findByLabelText("Name");
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });
});
