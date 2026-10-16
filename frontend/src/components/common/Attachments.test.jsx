import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { OrdersPage } from "@/pages/orders/OrdersPage";
import { attachmentsApi } from "@/services/attachments.service";
import { customersApi, productsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { setToken } from "@/utils/session";

// The evidence of a production order, page by page: the Factory Worker adds and deletes files, the Sale Worker only looks.

const renderAs = (user, path) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/sale/orders/*" element={<OrdersPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

const pdf = (name) => new File(["%PDF-1.4 test"], name, { type: "application/pdf" });

let made = 0;
async function startedOrder() {
  made += 1; // every call makes its own product and QT: the codes are unique
  setToken(tokenOf(mockUsers[0]));
  const product = await productsApi.create({ code: `EVI-P${made}`, name: "Evidence fridge", price: 1 });
  const customer = await customersApi.create({ name: `Evidence Customer ${made}` });
  const qt = await qtApi.create({ qtNumber: `QT-EVI-${made}`, qtDate: "2026-10-01", customerId: customer.id });
  const order = await ordersApi.create({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 1, unitPrice: 1, processes: [{ name: "Cut", instructions: "" }] }] });
  await ordersApi.start(order.id);
  return order;
}

describe("the evidence of a production order", () => {
  it("lets a Factory Worker add a file and delete it, and says who and when", async () => {
    const user = userEvent.setup();
    const order = await startedOrder();
    renderAs(mockUsers[1], `/sale/orders/${order.id}`);

    const section = (await screen.findByRole("heading", { name: "Evidence" })).closest("section");
    expect(await within(section).findByText("No file yet.")).toBeInTheDocument();

    await user.upload(within(section).getByLabelText(/Choose a file/), pdf("weld-check.pdf"));
    await user.click(within(section).getByRole("button", { name: "Upload" }));
    expect(await within(section).findByText("weld-check.pdf")).toBeInTheDocument();
    expect(section).toHaveTextContent("Evidence"); // the kind
    expect(section).toHaveTextContent("Worker"); // who

    await user.click(within(section).getByRole("button", { name: "Delete: weld-check.pdf" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(within(section).queryByText("weld-check.pdf")).not.toBeInTheDocument());
    expect(await within(section).findByText("No file yet.")).toBeInTheDocument();
  });

  it("refuses a file of a wrong type before it is sent", async () => {
    const user = userEvent.setup({ applyAccept: false });
    const order = await startedOrder();
    renderAs(mockUsers[1], `/sale/orders/${order.id}`);

    const section = (await screen.findByRole("heading", { name: "Evidence" })).closest("section");
    await user.upload(within(section).getByLabelText(/Choose a file/), new File(["text"], "notes.txt", { type: "text/plain" }));
    await user.click(within(section).getByRole("button", { name: "Upload" }));
    expect(await within(section).findByText("Choose a PDF, PNG or JPG file.")).toBeInTheDocument();
    expect(await attachmentsApi.list("ProductionOrder", order.id)).toEqual([]);
  });

  it("shows a Sale Worker the files without the form and without a delete button", async () => {
    const order = await startedOrder();
    setToken(tokenOf(mockUsers[1]));
    await attachmentsApi.create({ ownerType: "ProductionOrder", ownerId: order.id, kind: "EVIDENCE", file: { name: "seen.pdf", dataUrl: "data:application/pdf;base64,AAAA" } });
    renderAs(mockUsers[2], `/sale/orders/${order.id}`);

    const section = (await screen.findByRole("heading", { name: "Evidence" })).closest("section");
    expect(await within(section).findByText("seen.pdf")).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: "Download: seen.pdf" })).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: "Upload" })).not.toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: /^Delete/ })).not.toBeInTheDocument();
  });
});
