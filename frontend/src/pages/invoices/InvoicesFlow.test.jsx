import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/utils/pdf", () => ({ downloadPdf: vi.fn(async () => {}) }));

import { AuthContext } from "@/lib/auth-context";
import { AccountingPage } from "@/pages/accounting/AccountingPage";
import { customersApi, productsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { ordersApi } from "@/services/orders.service";
import { qtApi } from "@/services/qt.service";
import { downloadPdf } from "@/utils/pdf";
import { setToken } from "@/utils/session";
import { makeOrder } from "@/test/orders";

// Steps 6-7 of the workflow on the one Accounting page, driven like a person would on the mock: issue the invoice, pay it in full,
// open the receipt, and the paper of both (PDF, print).

const completedOrder = async () => {
  setToken(tokenOf(mockUsers[0]));
  const customer = await customersApi.create({ name: "Paper Customer", address: "5 Namba, Osaka" });
  const product = await productsApi.create({ code: "INV-FLOW", name: "Flow fridge", price: 100, bom: [] });
  const qt = await qtApi.create({ qtNumber: "QT-INV-FLOW", qtDate: "2026-10-01", customerId: customer.id });
  const order = await makeOrder({ qtId: qt.id, customerId: customer.id, orderDate: "2026-10-02", lines: [{ productId: product.id, quantity: 3, unitPrice: 250, processes: [{ name: "Cut", instructions: "" }] }] });
  await ordersApi.start(order.id);
  await ordersApi.recordProgress(order.id, { processId: order.lines[0].processes[0].id, status: "Completed", completedQuantity: 3, workDate: "2026-10-03", note: "" });
  return order;
};

const renderAccounting = (path = "/accounting") =>
  render(
    <AuthContext.Provider value={{ user: toPublicUser(mockUsers[0]), status: "authenticated" }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/accounting/*" element={<AccountingPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );

describe("accounting on one page", () => {
  it("issues the invoice, takes the full payment once and opens the receipt, all from the work list", async () => {
    const user = userEvent.setup();
    const order = await completedOrder();
    setToken(tokenOf(mockUsers[0]));
    window.print = vi.fn();
    renderAccounting();

    // To invoice: the completed order, with the one thing to do
    expect(await screen.findByRole("heading", { level: 1, name: "Accounting" })).toBeInTheDocument();
    const row = await screen.findByRole("row", { name: new RegExp(order.orderNumber) });
    expect(row).toHaveTextContent("Paper Customer");
    await user.click(within(row).getByRole("button", { name: /^Issue invoice/ }));
    const issue = await screen.findByRole("dialog", { name: "Issue this invoice?" });
    await user.click(within(issue).getByRole("button", { name: "Issue invoice" }));

    // the order left the first group; the invoice is waiting for payment, ¥750
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: /Waiting for payment/ }));
    const invoiceRow = await screen.findByRole("row", { name: /Paper Customer/ });
    expect(invoiceRow).toHaveTextContent("Unpaid");
    expect(invoiceRow).toHaveTextContent("¥750");

    // a wrong amount is refused, and the invoice stays waiting
    await user.click(within(invoiceRow).getByRole("button", { name: /^Record payment/ }));
    const pay = await screen.findByRole("dialog", { name: /^Payment: INV-/ });
    const amount = within(pay).getByLabelText("Amount paid");
    expect(amount).toHaveValue(750); // it starts as the total
    await user.clear(amount);
    await user.type(amount, "700");
    await user.click(within(pay).getByRole("button", { name: "Record payment" }));
    expect(await within(pay).findByText("The payment must be equal to the total of the invoice.")).toBeInTheDocument();

    // the full payment: Paid, the receipt is on the Paid tab
    await user.clear(amount);
    await user.type(amount, "750");
    await user.click(within(pay).getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await user.click(screen.getByRole("tab", { name: /Paid/ }));
    const paidRow = await screen.findByRole("row", { name: /Paper Customer/ });
    expect(paidRow).toHaveTextContent("Paid");
    const receiptLink = within(paidRow).getByRole("link", { name: /^Receipt: RC-\d{4}-\d{4}$/ });
    expect(receiptLink).toHaveAttribute("href", expect.stringMatching(/^\/accounting\/receipts\/\d+$/));

    // the invoice paper: no tax, the PDF
    await user.click(within(paidRow).getByRole("link", { name: /^INV-\d{4}-\d{4}$/ }));
    expect(await screen.findByRole("button", { name: "Download PDF" })).toBeInTheDocument(); // the paper itself is out of sight
    const paper = document.querySelector('[data-print-doc="invoice"]');
    for (const text of ["5 Namba, Osaka", "Total: ¥750", "No tax is charged."]) expect(paper).toHaveTextContent(text);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(downloadPdf.mock.calls[0][0]).toHaveAttribute("data-print-doc", "invoice");
    expect(downloadPdf.mock.calls[0][1]).toMatch(/^INV-\d{4}-\d{4}\.pdf$/);

    // the receipt paper: the PDF, the print, and the way back to the invoice
    await user.click(screen.getByRole("link", { name: /^RC-\d{4}-\d{4}$/ }));
    expect(await screen.findByRole("button", { name: "Download PDF" })).toBeInTheDocument();
    expect(document.querySelector('[data-print-doc="receipt"]')).toHaveTextContent("Amount received: ¥750");
    expect(screen.queryByText(/Payment method/)).not.toBeInTheDocument(); // there is no payment method
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    expect(downloadPdf.mock.calls[1][0]).toHaveAttribute("data-print-doc", "receipt");
    await user.click(screen.getByRole("button", { name: "Print" }));
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(document.body.dataset.printing).toBe("receipt");
    window.dispatchEvent(new Event("afterprint"));
    expect(screen.getByRole("link", { name: /^INV-\d{4}-\d{4}$/ })).toBeInTheDocument();
  });

  it("opens the work list from the old addresses of the invoices, the receipts and a new invoice", async () => {
    setToken(tokenOf(mockUsers[0]));
    for (const path of ["/accounting/invoices", "/accounting/invoices/new", "/accounting/receipts"]) {
      const view = renderAccounting(path);
      expect(await screen.findByRole("tab", { name: /To invoice/ })).toBeInTheDocument();
      view.unmount();
    }
  });
});
