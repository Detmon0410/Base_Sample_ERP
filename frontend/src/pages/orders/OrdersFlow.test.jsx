import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { customersApi, productsApi } from "@/services/master.service";
import { mockUsers, tokenOf, toPublicUser } from "@/services/mock/users";
import { qtApi } from "@/services/qt.service";
import { setToken } from "@/utils/session";

import { OrdersPage } from "./OrdersPage";

// The pages of the production orders, driven like a person would, on the mock (steps 2-5 of the workflow).

const renderAs = (user, path) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/sale/orders/*" element={<OrdersPage />} />
          <Route path="/403" element={<p>forbidden</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("production orders, page by page", () => {
  beforeAll(async () => {
    setToken(tokenOf(mockUsers[0]));
    const customer = await customersApi.create({ name: "Flow Customer" });
    await productsApi.create({ code: "FLOW-P", name: "Flow fridge", price: 5000 });
    await qtApi.create({ qtNumber: "QT-FLOW", qtDate: "2026-10-01", customerId: customer.id, file: { name: "q.pdf", dataUrl: "data:application/pdf;base64,AA==" } });
  });

  it("an Admin makes an order with a process, starts it, and a Worker completes it", async () => {
    const user = userEvent.setup();
    const view = renderAs(mockUsers[0], "/sale/orders/new");

    await screen.findByText("New production order");
    // saving the empty form shows the errors only now
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Some fields need your attention. Please check the marked fields.")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("option", { name: "QT-FLOW Flow Customer" })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("QT reference"), "QT-FLOW Flow Customer");
    expect(screen.getByLabelText("Customer")).toHaveDisplayValue("Flow Customer"); // the customer of the QT
    await waitFor(() => expect(screen.getByRole("option", { name: "FLOW-P Flow fridge" })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Product"), "FLOW-P Flow fridge");
    expect(screen.getByLabelText("Agreed unit price")).toHaveValue(5000); // the price of the product
    await user.type(screen.getByLabelText("Quantity"), "10");
    await user.click(screen.getByRole("button", { name: "Add a process" }));
    await user.type(screen.getByLabelText("Process"), "Cutting");
    await user.click(screen.getByRole("button", { name: "Save" }));

    // after Save the list opens
    const link = await screen.findByRole("link", { name: /^ORD-\d{4}-0001$/ });
    expect(screen.getByRole("row", { name: /Flow Customer/ })).toHaveTextContent("New");

    // the Admin starts it
    await user.click(link);
    await user.click(await screen.findByRole("button", { name: "Start production" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("Not started")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("New"); // no process has started yet
    const orderPath = `/sale/orders/${link.getAttribute("href").split("/").pop()}`;
    view.unmount();

    // a Worker records progress, 4 then all 10
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

  it("keeps a Worker out of the page of a new order", async () => {
    renderAs(mockUsers[1], "/sale/orders/new");
    expect(await screen.findByText("forbidden")).toBeInTheDocument();
  });
});
