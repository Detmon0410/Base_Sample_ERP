import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { customersApi, productsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { setToken } from "@/utils/session";

import { QtPage } from "./QtPage";

// QT 2.0, page by page: the lines, the customer PO, the printed form and Confirm QT, as a Sale Worker does them.

const renderAs = (user, path) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/sale/quotations/*" element={<QtPage />} />
          <Route path="/403" element={<p>forbidden</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

const pdf = (name) => new File(["%PDF-1.4 test"], name, { type: "application/pdf" });

describe("the QT page", () => {
  let customer;
  let door;

  beforeAll(async () => {
    setToken(tokenOf(mockUsers[0]));
    customer = await customersApi.create({ name: "Qt Page Customer", address: "5 Cold Street" });
    await productsApi.create({ code: "QTP-FR", name: "Page fridge", price: 45000 });
    door = await productsApi.create({ code: "QTP-DR", name: "Page door", price: 9000 });
  });

  it("makes a QT with lines (the price starts from the product), sends the customer PO, confirms, and sees the production order on the same page", async () => {
    const user = userEvent.setup();
    renderAs(mockUsers[2], "/sale/quotations/new");

    await screen.findByLabelText("QT number");
    await user.type(screen.getByLabelText("QT number"), "QT-PAGE-1");
    await waitFor(() => expect(screen.getByRole("option", { name: "Qt Page Customer" })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Customer"), "Qt Page Customer");

    // a new QT starts with one product line
    await waitFor(() => expect(screen.getByRole("option", { name: "QTP-FR Page fridge" })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Product"), "QTP-FR Page fridge");
    expect(screen.getByLabelText("Unit price")).toHaveValue(45000); // the price of the product
    await user.type(screen.getByLabelText("Quantity"), "10");
    expect(screen.getByText("Total: ¥450,000")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));

    // after Save the same QT opens again, now with Files, Download PDF and Print at the top, and Confirm QT; the paper itself is not shown
    expect(await screen.findByRole("heading", { name: "Files" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "QT form" })).not.toBeInTheDocument();
    const paper = document.querySelector('[data-print-doc="qt"]');
    expect(paper).toHaveTextContent("QT-PAGE-1");
    expect(paper).toHaveTextContent("5 Cold Street");
    expect(paper).toHaveTextContent("¥450,000");
    expect(paper).toHaveTextContent("Prepared by");

    // the customer PO: a file (kind PO file is the first), then Confirm
    const files = screen.getByRole("heading", { name: "Files" }).closest("section");
    await user.upload(within(files).getByLabelText(/Choose a file/), pdf("po-100.pdf"));
    await user.click(within(files).getByRole("button", { name: "Upload" }));
    expect(await within(files).findByText("po-100.pdf")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm QT" }));
    expect(await screen.findByText(/a production order is made from its products/)).toBeInTheDocument();
    expect(screen.queryByText(/not attached yet/)).not.toBeInTheDocument(); // the PO file is there: no warning
    await user.click(screen.getByRole("button", { name: "Confirm", exact: true }));
    // the same page now carries the production order: its processes can be added before the start
    expect(await screen.findByRole("heading", { name: /^Production order ORD-/ })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Add a process" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Steps of this job" })).toHaveTextContent("Confirmed");

    const [qt] = (await qtApi.list({ q: "QT-PAGE-1" })).items;
    expect(qt).toMatchObject({ status: "Confirmed", total: 450000 });
    const order = await ordersApi.get(qt.productionOrderId);
    expect(order.lines.map((line) => [line.productCode, line.quantity, line.unitPrice])).toEqual([["QTP-FR", 10, 45000]]);
  });

  it("needs a QT number: an empty one is refused (REQUIRED)", async () => {
    setToken(tokenOf(mockUsers[2]));
    await expect(qtApi.create({ qtNumber: "", qtDate: "2026-10-01", customerId: customer.id, lines: [{ productId: door.id, quantity: 1, unitPrice: 9000 }] })).rejects.toMatchObject({ status: 400 });
  });

  it("warns when the customer PO file is missing, and still confirms", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[2]));
    const qt = await qtApi.create({ qtNumber: "QT-PAGE-2", qtDate: "2026-10-01", customerId: customer.id, lines: [{ productId: door.id, quantity: 2, unitPrice: 9000 }] });
    renderAs(mockUsers[2], `/sale/quotations/${qt.id}`);

    await user.click(await screen.findByRole("button", { name: "Confirm QT" }));
    expect(await screen.findByText(/The customer PO file is not attached yet/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm", exact: true }));
    expect(await screen.findByRole("heading", { name: /^Production order ORD-/ })).toBeInTheDocument();
  });

  it("locks a confirmed QT: the customer and the lines are read only, there is no Confirm, and the order is linked", async () => {
    setToken(tokenOf(mockUsers[2]));
    const qt = await qtApi.create({ qtNumber: "QT-PAGE-3", qtDate: "2026-10-01", customerId: customer.id, lines: [{ productId: door.id, quantity: 1, unitPrice: 9000 }] });
    const { order } = await qtApi.confirm(qt.id);
    renderAs(mockUsers[2], `/sale/quotations/${qt.id}`);

    expect(await screen.findByText(/This QT is confirmed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: order.orderNumber })).toBeInTheDocument();
    expect(screen.getByLabelText("Customer")).toBeDisabled();
    expect((await screen.findAllByLabelText("Quantity"))[0]).toBeDisabled(); // the QT line; the order below has its own
    const qtLines = screen.getByRole("heading", { name: "Products" }).closest("section");
    expect(within(qtLines).queryByRole("button", { name: "Add a product" })).not.toBeInTheDocument(); // the order below still takes lines before it starts
    expect(screen.queryByRole("button", { name: "Confirm QT" })).not.toBeInTheDocument();
  });

  it("a Sale Worker prepares the whole job on this page: adds a process, and later sees the progress that a Factory Worker records", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[2]));
    const qt = await qtApi.create({ qtNumber: "QT-PAGE-4", qtDate: "2026-10-01", customerId: customer.id, lines: [{ productId: door.id, quantity: 4, unitPrice: 9000 }] });
    const { order } = await qtApi.confirm(qt.id);
    const view = renderAs(mockUsers[2], `/sale/quotations/${qt.id}`);

    await screen.findByRole("heading", { name: /^Production order ORD-/ });
    await user.click(await screen.findByRole("button", { name: "Add a process" }));
    await user.type(screen.getByLabelText("Process"), "Welding");
    const production = screen.getByRole("heading", { name: /^Production order ORD-/ }).closest("section");
    await user.click(within(production).getByRole("button", { name: "Save" }));
    await waitFor(async () => expect((await ordersApi.get(order.id)).lines[0].processes.map((process) => process.name)).toEqual(["Welding"]));
    expect(screen.getByRole("list", { name: "Steps of this job" })).toHaveTextContent("Confirmed");
    view.unmount();

    // the Admin starts it, the Factory Worker completes the process
    setToken(tokenOf(mockUsers[0]));
    await ordersApi.start(order.id);
    const started = await ordersApi.get(order.id);
    setToken(tokenOf(mockUsers[1]));
    await ordersApi.recordProgress(order.id, { processId: started.lines[0].processes[0].id, status: "Completed", completedQuantity: 4, workDate: "2026-10-02", note: "" });

    renderAs(mockUsers[2], `/sale/quotations/${qt.id}`);
    const done = await screen.findByRole("heading", { name: /^Production order ORD-/ });
    expect(await screen.findByRole("list", { name: "Steps of this job" })).toHaveTextContent("Done");
    expect(within(done.closest("section")).getAllByRole("row", { name: /Welding/ })[0]).toHaveTextContent("Completed");
    expect(screen.queryByRole("button", { name: "Add a process" })).not.toBeInTheDocument(); // started: the processes are locked
  });

  it("lists the QTs with the total, the status and the order, and keeps a Factory Worker out", async () => {
    const view = renderAs(mockUsers[2], "/sale/quotations");
    const row = await screen.findByRole("row", { name: /QT-PAGE-3/ });
    expect(row).toHaveTextContent("Confirmed");
    expect(row).toHaveTextContent("¥9,000");
    expect(row).toHaveTextContent(/ORD-\d{4}-\d{4}/);
    expect(screen.getByRole("row", { name: /QT-PAGE-2/ })).toHaveTextContent("Confirmed");
    view.unmount();

    // the route guard is in the routes of the app (AppRoutes); the API refuses the Factory Worker as well
    setToken(tokenOf(mockUsers[1]));
    await expect(qtApi.list({})).rejects.toMatchObject({ status: 403 });
  });
});
