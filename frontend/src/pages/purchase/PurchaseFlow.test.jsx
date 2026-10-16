import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeAll, describe, expect, it } from "vitest";

import { AuthContext } from "@/lib/auth-context";
import { materialsApi } from "@/services/master.service";
import { mockUsers, toPublicUser, tokenOf } from "@/services/mock/users";
import { purchaseApi } from "@/services/purchase.service";
import { suppliersApi } from "@/services/suppliers.service";
import { setToken } from "@/utils/session";

import { PurchasePage } from "./PurchasePage";
import { SuppliersPage } from "@/pages/suppliers/SuppliersPage";

// The Purchase page, driven like a Factory Worker does it, on the mock: stock that is low -> Create PO -> Save -> Sent -> Received (a lot,
// the stock grows) -> the payment. And the suppliers, that the Admin makes and a Factory Worker only looks at.

const renderAs = (user, path) => {
  setToken(tokenOf(user));
  return render(
    <AuthContext.Provider value={{ user: toPublicUser(user), status: "authenticated" }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/purchase/orders/*" element={<PurchasePage />} />
          <Route path="/master/suppliers/*" element={<SuppliersPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe("the Purchase page", () => {
  let steel;
  let supplier;

  beforeAll(async () => {
    setToken(tokenOf(mockUsers[0]));
    steel = await materialsApi.create({ code: "PF-STEEL", name: "Flow steel", unit: "kg", minLevel: 50, lots: [{ lotNumber: "S1", quantity: 20 }] }); // Low: 20 <= 50
    await materialsApi.create({ code: "PF-OK", name: "Plenty", minLevel: 5, lots: [{ lotNumber: "P1", quantity: 500 }] }); // Normal
    supplier = await suppliersApi.create({ code: "PF-SUP", name: "Flow Supplier", address: "9 Supply Road", active: true, items: [{ materialId: steel.id, unitPrice: 300 }] });
    await suppliersApi.create({ code: "PF-OFF", name: "Closed Supplier", active: false });
  });

  it("goes from a material that is low to a PO that is paid, and the stock grows when it is received", async () => {
    const user = userEvent.setup();
    renderAs(mockUsers[1], "/purchase/orders");

    // the stock that is low: only the material that is low, with Create PO
    const stock = (await screen.findByRole("heading", { name: "Stock to buy" })).closest("section");
    expect(await within(stock).findByText("PF-STEEL")).toBeInTheDocument();
    expect(within(stock).queryByText("PF-OK")).not.toBeInTheDocument();
    await user.click(within(stock).getByRole("link", { name: "Create PO: PF-STEEL" }));

    // the form opens ready: the supplier of the material, the missing quantity (50 - 20), the price of the supplier
    expect(await screen.findByLabelText("Supplier")).toHaveDisplayValue("PF-SUP Flow Supplier");
    await waitFor(() => expect(screen.getByLabelText("Quantity")).toHaveValue(30));
    expect(screen.getByLabelText("Unit price")).toHaveValue(300);
    expect(screen.getByLabelText("Material")).toHaveDisplayValue("PF-STEEL Flow steel");
    expect(screen.getByText("Total: ¥9,000")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /PF-OFF/ })).not.toBeInTheDocument(); // a supplier that is not active cannot be chosen
    await user.click(screen.getByRole("button", { name: "Save" }));

    // the PO is a Draft, with its number; it can be sent
    expect(await screen.findByRole("heading", { level: 1, name: /^PO-\d{4}-\d{4}\s*Draft$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PO form" })).toBeInTheDocument();
    const paper = document.querySelector('[data-print-doc="po"]');
    expect(paper).toHaveTextContent("Flow Supplier");
    expect(paper).toHaveTextContent("9 Supply Road");
    expect(paper).toHaveTextContent("¥9,000");
    expect(paper).toHaveTextContent("Received by");
    await user.click(screen.getByRole("button", { name: "Mark as sent" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Sent"));
    expect(screen.queryByRole("button", { name: "Mark as sent" })).not.toBeInTheDocument();
    expect(screen.getByText("The payment can be recorded when the PO is received.")).toBeInTheDocument();

    // received: a lot per line, then the stock is added
    await user.click(screen.getByRole("button", { name: "Mark as received" }));
    const lot = await screen.findByLabelText("Lot number: PF-STEEL");
    expect(lot.value).toMatch(/^LOT-\d{8}$/);
    await user.clear(lot);
    await user.type(lot, "S1"); // the lot that exists
    await user.click(screen.getByRole("button", { name: "Confirm: add to the stock" }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Received"));
    const [moved] = await materialsApi.get(steel.id).then((material) => [material.total]);
    expect(moved).toBe(50); // 20 + 30

    // the payment: it must be the total; then the PO is paid
    await user.type(screen.getByLabelText("Amount paid"), "100");
    await user.selectOptions(screen.getByLabelText("Payment method"), "Bank transfer");
    await user.type(screen.getByLabelText("Reference no."), "TT-77");
    await user.click(screen.getByRole("button", { name: "Record the payment" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByText("The payment must be equal to the total of the invoice.")).toBeInTheDocument();
    const amount = screen.getByLabelText("Amount paid");
    await user.clear(amount);
    await user.type(amount, "9000");
    await user.click(screen.getByRole("button", { name: "Record the payment" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    expect(await screen.findByText(/Paid on \d{4}-\d{2}-\d{2}: ¥9,000 by Bank transfer - TT-77/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record the payment" })).not.toBeInTheDocument(); // one payment only
  });

  it("changes a Draft, and shows a sent PO without the Edit button", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[1]));
    const po = await purchaseApi.create({ supplierId: supplier.id, requiredDate: "2026-12-01", department: "Factory", notes: "first", lines: [{ materialId: steel.id, quantity: 1, unitPrice: 300 }] });
    const view = renderAs(mockUsers[1], `/purchase/orders/${po.id}/edit`);

    const notes = await screen.findByLabelText("Notes");
    await user.clear(notes);
    await user.type(notes, "second");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findAllByText("second")).length).toBeGreaterThan(0); // the detail shows the new notes
    view.unmount();

    await purchaseApi.setStatus(po.id, { status: "Sent" });
    renderAs(mockUsers[1], `/purchase/orders/${po.id}`);
    expect(await screen.findByRole("button", { name: "Mark as received" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
  });

  it("lists the purchase orders with the status and whether they are paid", async () => {
    renderAs(mockUsers[1], "/purchase/orders");
    const rows = await screen.findAllByRole("row", { name: /Flow Supplier/ });
    expect(rows.length).toBeGreaterThanOrEqual(2); // the one of the first test (paid) and the one of the second (sent)
    expect(rows.some((row) => /Received/.test(row.textContent) && /Paid/.test(row.textContent))).toBe(true);
    expect(rows.some((row) => /Sent/.test(row.textContent) && /Not paid/.test(row.textContent))).toBe(true);
  });
});

describe("the suppliers page", () => {
  it("lets the Admin make a supplier with its materials and the Active switch, and lets a Factory Worker only look", async () => {
    const user = userEvent.setup();
    setToken(tokenOf(mockUsers[0]));
    const wire = await materialsApi.create({ code: "SF-WIRE", name: "Wire", unit: "m" });
    const view = renderAs(mockUsers[0], "/master/suppliers/new");

    await user.type(await screen.findByLabelText("Code"), "SF-SUP");
    await user.type(screen.getByLabelText("Name"), "Wire Supplier");
    expect(screen.getByLabelText("Active")).toBeChecked(); // active by default
    await user.click(screen.getByRole("button", { name: "Add a material" }));
    await waitFor(() => expect(screen.getByRole("option", { name: "SF-WIRE Wire (m)" })).toBeInTheDocument());
    await user.selectOptions(screen.getByLabelText("Material"), "SF-WIRE Wire (m)");
    await user.type(screen.getByLabelText("Initial price"), "45");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("link", { name: "SF-SUP" })).toBeInTheDocument();
    const [saved] = (await suppliersApi.list({ q: "SF-SUP" })).items;
    expect(saved).toMatchObject({ active: true, itemCount: 1 });
    expect((await suppliersApi.get(saved.id)).items).toMatchObject([{ materialId: wire.id, unitPrice: 45 }]);
    view.unmount();

    renderAs(mockUsers[1], `/master/suppliers/${saved.id}`);
    expect(await screen.findByLabelText("Name")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add a material" })).not.toBeInTheDocument();
  });
});
