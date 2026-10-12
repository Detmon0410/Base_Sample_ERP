import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/pdf", () => ({ downloadPdf: vi.fn(async () => {}) }));

import { AuthContext } from "@/lib/auth-context";
import { customersApi, productsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { downloadPdf } from "@/utils/pdf";
import { setToken } from "@/utils/session";

import { InvoicesPage } from "./InvoicesPage";

// Steps 6-7 of the workflow, driven like a person would, on the mock: issue the invoice, pay it in full, get the receipt, print.

const completedOrder = async () => {
  setToken(tokenOf(mockUsers[0]));
  const customer = await customersApi.create({ name: "Paper Customer", address: "5 Namba, Osaka" });
  const product = await productsApi.create({ code: "INV-FLOW", name: "Flow fridge", price: 100, bom: [] });
  const qt = await qtApi.create({ qtNumber: "QT-INV-FLOW", qtDate: "2026-10-01", customerId: customer.id, file: { name: "q.pdf", dataUrl: "data:application/pdf;base64,AA==" } });
  const order = await ordersApi.create({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 3, unitPrice: 250, processes: [{ name: "Cut", instructions: "" }] }] });
  await ordersApi.start(order.id);
  await ordersApi.recordProgress(order.id, { processId: order.lines[0].processes[0].id, status: "Completed", completedQuantity: 3, workDate: "2026-10-03", note: "" });
  return order;
};

describe("invoices, page by page", () => {
  it("issues an invoice after a confirmation, takes the full payment once, and shows the receipt", async () => {
    const user = userEvent.setup();
    const order = await completedOrder();
    setToken(tokenOf(mockUsers[0]));
    window.print = vi.fn();

    render(
      <AuthContext.Provider value={{ user: toPublicUser(mockUsers[0]), status: "authenticated" }}>
        <MemoryRouter initialEntries={["/invoices/new"]}>
          <Routes>
            <Route path="/invoices/*" element={<InvoicesPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    // nothing is chosen: the error is shown only after Save
    await user.click(await screen.findByRole("button", { name: "Save" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("Enter or choose a value.")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByRole("option", { name: `${order.orderNumber} Paper Customer` })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Production order"), `${order.orderNumber} Paper Customer`);
    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));

    // the list: the invoice, Unpaid, ¥750
    const link = await screen.findByRole("link", { name: /^INV-\d{4}-\d{4}$/ });
    expect(screen.getByRole("row", { name: /Paper Customer/ })).toHaveTextContent("Unpaid");
    expect(screen.getByRole("row", { name: /Paper Customer/ })).toHaveTextContent("¥750");
    await user.click(link);

    // the document, with no tax
    expect(await screen.findByRole("heading", { level: 2, name: "Invoice" })).toBeInTheDocument();
    expect(screen.getByText("5 Namba, Osaka")).toBeInTheDocument();
    expect(screen.getByText("Total: ¥750")).toBeInTheDocument();
    expect(screen.getByText("No tax is charged.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: "Receipt" })).not.toBeInTheDocument();

    // a wrong amount is refused after the confirmation; the invoice stays Unpaid
    await user.type(screen.getByLabelText("Amount paid"), "700");
    await user.click(screen.getByRole("button", { name: "Record the payment" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("Enter or choose a value.")).toBeInTheDocument(); // the payment method is required
    await user.selectOptions(screen.getByLabelText("Payment method"), "Bank transfer");
    await user.type(screen.getByLabelText("Reference or notes (optional)"), "Slip 555");
    await user.click(screen.getByRole("button", { name: "Record the payment" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("The payment must be equal to the total of the invoice.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Unpaid");

    // the full payment: Paid, and the receipt
    const amount = screen.getByLabelText("Amount paid");
    await user.clear(amount);
    await user.type(amount, "750");
    await user.click(screen.getByRole("button", { name: "Record the payment" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Receipt" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Paid");
    expect(screen.getByText(/^Amount received: ¥750$/)).toBeInTheDocument();
    expect(screen.getByText("Payment method: Bank transfer")).toBeInTheDocument(); // on the receipt
    expect(screen.getByText(/Bank transfer - Slip 555$/)).toBeInTheDocument(); // the payment made
    expect(screen.queryByLabelText("Amount paid")).not.toBeInTheDocument(); // one payment only

    // print: only the chosen document is marked for the paper
    // the PDF files: the invoice, then the receipt, each under its number
    await user.click(screen.getAllByRole("button", { name: "Download PDF" })[1]);
    expect(downloadPdf).toHaveBeenCalledTimes(1);
    const [element, fileName] = downloadPdf.mock.calls[0];
    expect(element).toHaveAttribute("data-print-doc", "receipt");
    expect(fileName).toMatch(/^RC-\d{4}-\d{4}\.pdf$/);
    await user.click(screen.getAllByRole("button", { name: "Download PDF" })[0]);
    expect(downloadPdf.mock.calls[1][0]).toHaveAttribute("data-print-doc", "invoice");
    expect(downloadPdf.mock.calls[1][1]).toMatch(/^INV-\d{4}-\d{4}\.pdf$/);

    await user.click(screen.getAllByRole("button", { name: "Print" })[1]);
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.body.dataset.printing).toBe("receipt");
    window.dispatchEvent(new Event("afterprint"));
    expect(document.body.dataset.printing).toBeUndefined();
  });
});
